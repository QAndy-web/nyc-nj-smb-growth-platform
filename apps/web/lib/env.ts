type SupabaseEnv = { url: string; serviceRoleKey: string };
type IngestionEnv = SupabaseEnv & { googleMapsApiKey: string };

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getSupabaseEnv(): SupabaseEnv {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function getIngestionEnv(): IngestionEnv {
  return {
    ...getSupabaseEnv(),
    googleMapsApiKey: required("GOOGLE_MAPS_API_KEY"),
  };
}
