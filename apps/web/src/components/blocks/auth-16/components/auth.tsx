import { AuthFooter } from "./auth-footer";
import { AuthHeader } from "./auth-header";
import { SignInForm } from "./sign-in-form";

export function Auth() {
  return (
    <div className="flex min-h-svh w-full flex-col">
      <AuthHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-10 sm:px-8 sm:py-12">
        <SignInForm />
      </main>
      <AuthFooter />
    </div>
  );
}
