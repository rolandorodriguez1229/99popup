import { supabase } from '@/lib/supabase';
import { parseStringPromise } from 'xml2js';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
    }

    // Leer el contenido del archivo
    const fileBuffer = await file.arrayBuffer();
    const xmlData = new TextDecoder().decode(fileBuffer);

    // Convertir XML a JSON
    const result = await parseStringPromise(xmlData);
    const fileData = result.VIRTEK_BUILDING_MATERIAL_MARKUP_LANGUAGE_FILE;

    // Extraer HEADER_DATA
    const header = fileData.HEADER_DATA;
    const jobNumber = header.JOB_NAME || 'Unknown';
    const fileName = file.name;

    // Extraer STRUCTURE_DATA
    const structures = Array.isArray(fileData.STRUCTURE_DATA)
      ? fileData.STRUCTURE_DATA
      : [fileData.STRUCTURE_DATA];

    for (const structure of structures) {
      const structureId = structure.STRUCTURE_ID;
      const totalMembers = structure.MEMBER_QTY;

      // Insertar en bundles99
      const { data: bundle, error: bundleError } = await supabase
        .from('bundles99')
        .insert({
          job_number: jobNumber,
          file_name: fileName,
          total_members: totalMembers,
          bundle_layer: structure.BUNDLE_LAYER || null,
        })
        .select()
        .single();

      if (bundleError) {
        console.error('Error inserting bundle:', bundleError);
        continue;
      }

      // Extraer datos de MEMBER_DATA
      const members = Array.isArray(fileData.MEMBER_DATA)
        ? fileData.MEMBER_DATA
        : [fileData.MEMBER_DATA];

      const membersToInsert = members
        .filter((member) => member.MEMBER_ID.startsWith(structureId))
        .map((member) => ({
          bundle_id: bundle.id,
          member_id: member.MEMBER_ID,
          type: member.TYPE,
          name: member.NAME,
          description: member.DESCRIPTION,
          height: parseFloat(member.HEIGHT?._),
          width: parseFloat(member.WIDTH?._),
          actual_height: parseFloat(member.ACTUAL_HEIGHT?._),
          actual_width: parseFloat(member.ACTUAL_WIDTH?._),
          length: parseFloat(member.LENGTH?._),
          unique_id: member.UNIQUE_ID,
        }));

      // Insertar miembros en members99
      if (membersToInsert.length > 0) {
        const { error: membersError } = await supabase
          .from('members99')
          .insert(membersToInsert);

        if (membersError) {
          console.error('Error inserting members:', membersError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'XML processed' }), { status: 200 });
  } catch (error) {
    console.error('Error processing XML:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

