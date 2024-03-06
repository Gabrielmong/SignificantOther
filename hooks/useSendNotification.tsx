const FCM_GOOGLE_URL = 'https://fcm.googleapis.com/v1/projects/myproject-b5ae1/messages:send';

export const useSendNotification = () => {
  const sendNotification = async (message: string, token: string) => {
    const response = await fetch(FCM_GOOGLE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: 'New Message',
            body: message,
          },
        },
      }),
    });

    return response;
  };

  return { sendNotification };
};
