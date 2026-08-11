import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreateNewConversation } from '../../components';

export function NewConversation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return (
    <CreateNewConversation
      message={searchParams.get('message') ?? ''}
      onClose={() => navigate('/conversations')}
    />
  );
}
