import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useT, useOpenpeeps } from '@openpeeps/react';

export function PaymentSuccess() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { openpeepsApi } = useOpenpeeps();

  // Re-use the payment status endpoint as a verification ping. It returns 200
  // once Stripe has acknowledged the checkout.
  const paymentStatus = openpeepsApi.usePaymentStatus();
  const verified =
    paymentStatus.data && paymentStatus.data.status !== 'none';

  useEffect(() => {
    if (!verified) return;
    if (params.has('user')) {
      navigate('/feeds/local');
    } else {
      navigate('/welcome');
    }
  }, [verified, params, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4 text-center">
      {verified ? (
        <>
          <CheckCircle size={60} className="text-green-500" />
          <p className="mt-4 max-w-sm text-lg text-gray-700">
            {t('payment.success.message', {
              defaultValue: 'Payment received. Redirecting…',
            })}
          </p>
        </>
      ) : (
        <>
          <Loader2 size={48} className="animate-spin text-emerald-500" />
          <p className="mt-6 max-w-sm text-lg text-gray-600">
            {t('payment.success.verifying', {
              defaultValue: 'Verifying your payment…',
            })}
          </p>
        </>
      )}
    </div>
  );
}
