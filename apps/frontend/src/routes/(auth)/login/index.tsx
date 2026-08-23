import { AuthWrapper } from '@/features/auth/ui/AuthWrapper';
import { createFileRoute } from '@tanstack/react-router';
import { LoginForm } from '@/features/auth/forms/LoginForm';
import { AuthSwitch } from '@/features/auth/ui/AuthSwitch';
import { GoogleSignInButton } from '@/features/auth/ui/GoogleSignInButton';

export const Route = createFileRoute('/(auth)/login/')({
  validateSearch: (search: Record<string, unknown>) => {
    if (
      typeof search.invitationToken === 'string' &&
      /^[0-9a-f]{64}$/i.test(search.invitationToken)
    ) {
      return {
        invitationToken: search.invitationToken,
      };
    }

    return {};
  },
  component: Login,
});

function Login() {
  const { invitationToken } = Route.useSearch();

  return (
    <AuthWrapper title="Witaj ponownie" subtitle="Zaloguj się do swojego konta">
      <GoogleSignInButton invitationToken={invitationToken} />

      <div
        className="flex items-center gap-[30px] text-gray-500 sm:my-[25px] my-[20px]
         before:h-[2px] before:flex-1 before:bg-icon
         after:h-[2px] after:flex-1 after:bg-icon"
      >
        <span className="text-[14px] font-medium text-content-muted">lub</span>
      </div>

      <LoginForm invitationToken={invitationToken} />
      <AuthSwitch type="signup" className="mt-[10px]" />
    </AuthWrapper>
  );
}
