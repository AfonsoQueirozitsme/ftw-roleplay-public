// shared/discordPerms.ts
export const DISCORD_GUILD_ID = Deno.env.get("DISCORD_GUILD_ID") ?? ""; // preenche
export const ROLE_IDS = {
  SUPORTE: "1320804051092246681",
  SENIOR_SUPORTE: "1320804049498669076",

  SUPERVISAO: "1327039801412554833",
  SENIOR_SUPERVISAO: "1327039801412554833", // <- confirm a duplicação

  ADMIN: "1320804047485272127",
  SENIOR_ADMIN: "1320804046939881512",
  HEAD_ADMIN: "1320804046117929020",

  GESTAO: "1320804054019866644",

  BUGS_EQ: "1320804052887666760",
  BUGS_SUP: "1320804052040159264",
} as const;

export function rolesToPerms(roleIds: string[]) {
  const has = (id: string) => roleIds.includes(id);
  const perms = new Set<string>();

  // Suporte
  if (has(ROLE_IDS.SUPORTE)) {
    perms.add("ftw.support.read");
    perms.add("ftw.support.reply");
  }
  if (has(ROLE_IDS.SENIOR_SUPORTE)) {
    perms.add("ftw.support.manage");
    perms.add("ftw.tickets.escalate");
  }

  // Supervisão
  if (has(ROLE_IDS.SUPERVISAO)) perms.add("ftw.supervise.basic");
  if (has(ROLE_IDS.SENIOR_SUPERVISAO)) perms.add("ftw.supervise.advanced");

  // Admin ladder
  if (has(ROLE_IDS.ADMIN)) perms.add("ftw.admin.basic");
  if (has(ROLE_IDS.SENIOR_ADMIN)) perms.add("ftw.admin.senior");
  if (has(ROLE_IDS.HEAD_ADMIN)) perms.add("ftw.admin.head");

  // Gestão
  if (has(ROLE_IDS.GESTAO)) perms.add("ftw.management.all");

  // Bugs team
  if (has(ROLE_IDS.BUGS_EQ)) perms.add("ftw.bugs.read");
  if (has(ROLE_IDS.BUGS_SUP)) perms.add("ftw.bugs.manage");

  // Grupos ACE (FiveM) derivados
  // Mapeia grupos agregados para facilitar no servidor
  if ([...perms].some(p => p.startsWith("ftw.support"))) perms.add("group.ftw_support");
  if ([...perms].some(p => p.startsWith("ftw.supervise"))) perms.add("group.ftw_supervise");
  if ([...perms].some(p => p.startsWith("ftw.admin"))) perms.add("group.ftw_admin");
  if (perms.has("ftw.management.all")) perms.add("group.ftw_management");
  if ([...perms].some(p => p.startsWith("ftw.bugs"))) perms.add("group.ftw_bugs");

  return [...perms];
}
