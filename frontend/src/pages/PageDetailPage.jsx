import { useParams } from 'react-router-dom';
export default function PageDetailPage() {
  const { id } = useParams();
  return <div style={{ padding: 24 }}>Page {id} (TODO Task 8)</div>;
}
