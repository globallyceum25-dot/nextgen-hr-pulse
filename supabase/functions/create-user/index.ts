import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.24.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CreateUserSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(128),
  full_name: z.string().trim().min(1).max(120).optional().or(z.literal("")),
  role: z.string().trim().min(1).max(64),
});

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const findExistingUserByEmail = async (
  adminClient: ReturnType<typeof createClient>,
  email: string,
) => {
  const normalizedEmail = email.toLowerCase();

  const { data: profile } = await adminClient
    .from("profiles")
    .select("user_id, email, full_name")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (profile?.user_id) {
    return { userId: profile.user_id, fullName: profile.full_name ?? null };
  }

  const { data: usersPage, error: usersError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (usersError) {
    throw usersError;
  }

  const matchedUser = usersPage.users.find(
    (user) => user.email?.toLowerCase() === normalizedEmail,
  );

  return matchedUser
    ? {
        userId: matchedUser.id,
        fullName:
          typeof matchedUser.user_metadata?.full_name === "string"
            ? matchedUser.user_metadata.full_name
            : null,
      }
    : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "No authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
      return jsonResponse({ error: "Backend configuration is incomplete" }, 500);
    }

    const callerClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();

    if (!caller) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRoles, error: callerRolesError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    if (callerRolesError) {
      return jsonResponse({ error: callerRolesError.message }, 500);
    }

    const isAdmin = callerRoles?.some(
      (assignedRole) =>
        assignedRole.role === "super_admin" || assignedRole.role === "sector_hr_admin",
    );

    if (!isAdmin) {
      return jsonResponse({ error: "Only admins can create users" }, 403);
    }

    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON payload" }, 400);
    }

    const parsedBody = CreateUserSchema.safeParse(requestBody);
    if (!parsedBody.success) {
      return jsonResponse(
        {
          error: "Invalid input",
          fields: parsedBody.error.flatten().fieldErrors,
        },
        400,
      );
    }

    const { email, password, full_name, role } = parsedBody.data;
    const normalizedEmail = email.toLowerCase();
    let targetUserId: string | null = null;
    let userCreated = false;

    const existingUser = await findExistingUserByEmail(adminClient, normalizedEmail);
    if (existingUser?.userId) {
      targetUserId = existingUser.userId;

      // Update the password and confirm email for existing user
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        targetUserId,
        {
          password,
          email_confirm: true,
          user_metadata: { full_name: full_name || existingUser.fullName || normalizedEmail },
        },
      );

      if (updateError) {
        console.error("Failed to update existing user password:", updateError.message);
      }
    } else {
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || normalizedEmail },
      });

      if (createError) {
        const recoveredUser = await findExistingUserByEmail(adminClient, normalizedEmail);
        if (recoveredUser?.userId) {
          targetUserId = recoveredUser.userId;

          // Also update password for recovered user
          await adminClient.auth.admin.updateUserById(targetUserId, {
            password,
            email_confirm: true,
          });
        } else {
          return jsonResponse({ error: createError.message }, 400);
        }
      } else {
        targetUserId = newUser.user.id;
        userCreated = true;
      }
    }

    if (!targetUserId) {
      return jsonResponse({ error: "Unable to resolve the target user" }, 500);
    }

    const { data: existingRole, error: existingRoleError } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", targetUserId)
      .eq("role", role)
      .maybeSingle();

    if (existingRoleError && existingRoleError.code !== "PGRST116") {
      return jsonResponse({ error: existingRoleError.message }, 500);
    }

    if (existingRole?.id) {
      return jsonResponse({
        success: true,
        user_id: targetUserId,
        user_existed: true,
        role_assigned: false,
        message: "This user already has the selected role",
      });
    }

    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: targetUserId, role });

    if (roleError) {
      if (roleError.message.toLowerCase().includes("duplicate")) {
        return jsonResponse({
          success: true,
          user_id: targetUserId,
          user_existed: true,
          role_assigned: false,
          message: "This user already has the selected role",
        });
      }

      return jsonResponse({ error: roleError.message }, 400);
    }

    return jsonResponse({
      success: true,
      user_id: targetUserId,
      user_existed: !userCreated,
      role_assigned: true,
      message: userCreated
        ? "User created and role assigned successfully"
        : "Existing user found and role assigned successfully",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
