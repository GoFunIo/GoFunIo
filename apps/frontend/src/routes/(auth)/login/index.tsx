import { AuthWrapper } from '@/features/auth/ui/AuthWrapper';
import { createFileRoute } from '@tanstack/react-router';
import { getImage } from '@/utils/getImage';
import { LoginForm } from '@/features/auth/forms/LoginForm';
import { AuthSwitch } from '@/features/auth/ui/AuthSwitch';

export const Route = createFileRoute('/(auth)/login/')({
  component: Login,
});

function Login() {
  return (
    <AuthWrapper title="Witaj ponownie" subtitle="Zaloguj się do swojego konta">
      <button className="cursor-pointer my-[30px] flex items-center justify-center gap-[16px] h-[45px] w-full bg-bg-section rounded-[7px] border border-icon">
        <img src={getImage('google.svg')} alt="Google icon" className="" />
        <p className="text-[14px] font-medium text-content-muted">Zaloguj się przez Google</p>
      </button>

      <div
        className="flex items-center gap-[30px] text-gray-500
         before:h-[2px] before:flex-1 before:bg-icon
         after:h-[2px] after:flex-1 after:bg-icon"
      >
        <span className="text-[14px] font-medium text-content-muted">lub</span>
      </div>

      <LoginForm className="pt-[30px]" />
      <AuthSwitch type="signup" className="mt-[10px]" />
    </AuthWrapper>
  );
}
