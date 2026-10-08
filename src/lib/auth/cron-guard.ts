/**
 * Whether a request comes from Cloud Scheduler (Bearer CRON_SECRET) or a
 * manual run (?secret=REVALIDATE_SECRET). For the push jobs, which must
 * never be triggerable by a stranger: each run can buzz every phone.
 */
export function isCronRequest(request: Request): boolean {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  const secret = new URL(request.url).searchParams.get("secret");
  return Boolean(process.env.REVALIDATE_SECRET && secret === process.env.REVALIDATE_SECRET);
}
