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

    // Extraer `MEMBER_DATA`
    const members = Array.isArray(fileData.MEMBER_DATA)
      ? fileData.MEMBER_DATA
      : [fileData.MEMBER_DATA];

    // Lista de tipos a extraer
    const allowedTypes = ['STUD', 'KING', 'JACK', 'Hdr Cripple', 'Sill Cripple', 'Sill', 'Header', 'Cripple', 'Block'];

    // Filtrar miembros según los tipos permitidos
    const filteredMembers = members.filter(member => allowedTypes.includes(member.TYPE));

    // Transformar datos para Supabase
    const membersToInsert = filteredMembers.map(member => ({
      type: member.TYPE,
      name: member.NAME,
      description: member.DESCRIPTION,
      height: parseFloat(member.HEIGHT?._),
      width: parseFloat(member.WIDTH?._),
      actual_height: parseFloat(member.ACTUAL_HEIGHT?._),
      actual_width: parseFloat(member.ACTUAL_WIDTH?._),
      length: parseFloat(member.LENGTH?._),
    }));

    // Insertar en Supabase
    if (membersToInsert.length > 0) {
      const { error } = await supabase.from('members99').insert(membersToInsert);
      if (error) {
        console.error('Error inserting members:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'XML processed' }), { status: 200 });
  } catch (error) {
    console.error('Error processing XML:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

