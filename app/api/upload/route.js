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

    // Verificar si MEMBER_DATA existe
    if (!fileData.MEMBER_DATA) {
      return new Response(JSON.stringify({ error: 'No MEMBER_DATA found in XML' }), { status: 400 });
    }

    const members = Array.isArray(fileData.MEMBER_DATA)
      ? fileData.MEMBER_DATA
      : [fileData.MEMBER_DATA];

    // Lista de tipos a extraer
    const allowedTypes = ['STUD', 'KING', 'JACK', 'Hdr Cripple', 'Sill Cripple', 'Sill', 'Header', 'Cripple', 'Block'];

    // Filtrar miembros según los tipos permitidos
    const filteredMembers = members.filter(member => allowedTypes.includes(member.TYPE));

    console.log('🔍 Miembros filtrados:', filteredMembers.length, filteredMembers); // ✅ Verificar qué miembros se están filtrando

    if (filteredMembers.length === 0) {
      return new Response(JSON.stringify({ warning: 'No valid members found in XML' }), { status: 200 });
    }

    // Transformar datos para Supabase
    const membersToInsert = filteredMembers.map(member => ({
      type: member.TYPE,
      name: member.NAME || null,
      description: member.DESCRIPTION || null,
      height: member.HEIGHT ? parseFloat(member.HEIGHT._) : null,
      width: member.WIDTH ? parseFloat(member.WIDTH._) : null,
      actual_height: member.ACTUAL_HEIGHT ? parseFloat(member.ACTUAL_HEIGHT._) : null,
      actual_width: member.ACTUAL_WIDTH ? parseFloat(member.ACTUAL_WIDTH._) : null,
      length: member.LENGTH ? parseFloat(member.LENGTH._) : null,
    }));

    console.log('📝 Datos a insertar en Supabase:', membersToInsert); // ✅ Verificar datos antes de insertarlos

    // Insertar en Supabase
    const { error } = await supabase.from('members99').insert(membersToInsert);

    if (error) {
      console.error('❌ Error al insertar en Supabase:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, message: 'XML processed and saved', inserted: membersToInsert.length }), { status: 200 });

  } catch (error) {
    console.error('❌ Error procesando XML:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

