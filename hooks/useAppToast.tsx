import { useToast, Toast, ToastDescription, ToastTitle, VStack } from '@gluestack-ui/themed';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AppToast {
  title: string;
  description: string;
  duration?: number;
  placement?:
    | 'top'
    | 'bottom'
    | 'top right'
    | 'top left'
    | 'bottom left'
    | 'bottom right'
    | undefined;
  onCloseComplete?: () => void;
  status: 'success' | 'error' | 'info';
}

export function useAppToast() {
  const toast = useToast();

  const showToast = ({
    title,
    description,
    duration = 5000,
    placement = 'top',
    onCloseComplete,
    status,
  }: AppToast) => {
    return toast.show({
      duration,
      placement,
      onCloseComplete,
      render: ({ id }) => {
        const toastId = 'toast' + id;
        return (
          <SafeAreaView
            style={{
              flex: 1,
            }}>
            <Toast nativeID={toastId}>
              <VStack space="xs">
                <ToastTitle>{title}</ToastTitle>
                <ToastDescription>{description}</ToastDescription>
              </VStack>
            </Toast>
          </SafeAreaView>
        );
      },
    });
  };

  return {
    showToast,
  };
}
