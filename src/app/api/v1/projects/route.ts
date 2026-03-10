import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, projects } from "@/lib/db/schema";
import { requireApiAuth, isAuthError } from "@/lib/api/auth";
import { organizationBelongsToAccount } from "@/lib/api/access";
import { ok, created, validationError, serverError } from "@/lib/api/response";
import { createProjectSchema } from "@/lib/validators/tenant";
import { slugify } from "@/lib/slugify";
import { ZodError, z } from "zod";

const createProjectBodySchema = z.object({
  organizationId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  url: z.string().url().optional(),
});

export async function GET(request: Request) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const rows = await db
      .select({ project: projects })
      .from(projects)
      .innerJoin(organizations, eq(projects.organizationId, organizations.id))
      .where(eq(organizations.accountId, auth.accountId))
      .orderBy(desc(projects.createdAt));

    return ok(rows.map(({ project }) => project));
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const validatedBody = createProjectBodySchema.parse(body);
    const organizationId =
      validatedBody.organizationId ?? auth.defaultOrganizationId;

    if (!(await organizationBelongsToAccount(auth.accountId, organizationId))) {
      return validationError(
        new ZodError([
          {
            code: "custom",
            path: ["organizationId"],
            message: "Organization must belong to the authenticated account",
          },
        ])
      );
    }

    const slug = slugify(validatedBody.name);

    const validated = createProjectSchema.parse({
      organizationId,
      name: validatedBody.name,
      slug,
      description: validatedBody.description,
      url: validatedBody.url,
    });

    const [project] = await db
      .insert(projects)
      .values({
        organizationId: validated.organizationId,
        name: validated.name,
        slug: validated.slug,
        description: validated.description ?? null,
        url: validated.url ?? null,
      })
      .returning();

    return created(project);
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return serverError(error);
  }
}
