import { redirect } from "next/navigation";

export const metadata = { title: "Catalog — FerixCourse" };

/*
  /learn was the first catalog screen and has been superseded by /catalog,
  which is on the rebuild design. Marketing links still point here, so keep
  the URL working with a permanent redirect instead of maintaining two
  catalogs.
*/
export default function LearnPage() {
  redirect("/catalog");
}
