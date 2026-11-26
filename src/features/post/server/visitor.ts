import { cookies } from "next/headers";

import { parseVisitorId, VISITOR_COOKIE } from "../visitor";

/** The like cookie of the current request, when the visitor has liked before. */
export async function getVisitorId(): Promise<string | undefined> {
  return parseVisitorId((await cookies()).get(VISITOR_COOKIE)?.value);
}
