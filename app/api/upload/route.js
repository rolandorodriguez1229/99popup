import { supabase } from '@/lib/supabase'; 
import FileUploader from '@/components/FileUploader';
export async function POST(req) {
  try {
    const formData = await req.json();
    console.log("Received data:", formData);

    const { jobNumber, fileName, members, file } = formData; // Asegúrate de que el archivo esté incluido

    if (!file) {
      throw new Error("No file provided");
    }

    // Intenta subir el archivo a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("uploads") // Asegúrate de que "uploads" es el bucket correcto en Supabase
      .upload(`files/${fileName}`, file, { contentType: file.type });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    console.log("File uploaded:", uploadData);

    // Guarda la información del bundle en la base de datos
    const { data: bundle, error: bundleError } = await supabase
      .from("bundles99")
      .insert({
        job_number: jobNumber,
        file_name: fileName,
        total_members: members.length,
        total_studs: members.filter((m) => m.type.toLowerCase() === "stud").length,
        file_url: uploadData.path, // Guarda la ruta del archivo en la base de datos
      })
      .select()
      .single();

    if (bundleError) throw bundleError;

    // Guarda los miembros en la base de datos
    const { error: membersError } = await supabase.from("members99").insert(
      members.map((member) => ({
        ...member,
        bundle_id: bundle.id,
      }))
    );

    if (membersError) throw membersError;

    return new Response(JSON.stringify({ success: true, bundle }), { status: 200 });
  } catch (error) {
    console.error("Error in API route:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
