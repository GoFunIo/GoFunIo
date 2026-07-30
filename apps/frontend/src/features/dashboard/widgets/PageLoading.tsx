import { LoadingIcon } from '@/components/ui/LoadingIcon';

export const PageLoading = () => {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <LoadingIcon size={32} />
    </div>
  );
};
