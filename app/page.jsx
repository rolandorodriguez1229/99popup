import { supabase } from '@/lib/supabase';
import FileUploader from '@/components/FileUploader';

export default async function HomePage() {
  const { data: bundles } = await supabase
    .from('bundles99')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1>Subir Archivos XML</h1>
      <FileUploader />
      
      <h2>Bundles Subidos</h2>
      <ul>
        {bundles?.map((bundle) => (
          <li key={bundle.id}>{bundle.file_name} - {bundle.job_number}</li>
        ))}
      </ul>
    </div>
  );
}
