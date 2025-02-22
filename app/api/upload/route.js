import { supabase } from '@/lib/supabase'; 
import FileUploader from '@/components/FileUploader';




export async function POST(req) {
  try {
    const formData = await req.json();
    const { jobNumber, fileName, members } = formData;

    // Insertar el bundle en la base de datos
    const { data: bundle, error: bundleError } = await supabase
      .from('bundles99')
      .insert({
        job_number: jobNumber,
        file_name: fileName,
        total_members: members.length,
        total_studs: members.filter(m => m.type.toLowerCase() === 'stud').length
      })
      .select()
      .single();

    if (bundleError) throw bundleError;

    // Insertar los miembros asociados al bundle
    const { error: membersError } = await supabase
      .from('members99')
      .insert(
        members.map(member => ({
          ...member,
          bundle_id: bundle.id
        }))
      );

    if (membersError) throw membersError;

    return new Response(JSON.stringify({ success: true, bundle }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
