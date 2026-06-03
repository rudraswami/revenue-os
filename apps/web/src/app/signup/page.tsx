import { redirect } from "next/navigation";

/** Some users expect /signup — our route is /register */
export default function SignupRedirect() {
  redirect("/register");
}
