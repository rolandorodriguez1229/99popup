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
    
    // Agregar logs para debug
    console.log('Contenido XML recibido:', xmlData.substring(0, 200)); // Solo los primeros 200 caracteres

    // Convertir XML a JSON con opciones explícitas
    const result = await parseStringPromise(xmlData, {
      explicitArray: false,
      mergeAttrs: true
    });

    // Verificar la estructura del resultado parseado
    console.log('Estructura después de parsear:', JSON.stringify(result, null, 2));

    const fileData = result.VIRTEK_BUILDING_MATERIAL_MARKUP_LANGUAGE_FILE;
    
    if (!fileData.MEMBER_DATA) {
      return new Response(JSON.stringify({ error: 'No MEMBER_DATA found in XML' }), { status: 400 });
    }

    // Asegurarnos que MEMBER_DATA sea un array
    const members = Array.isArray(fileData.MEMBER_DATA) 
      ? fileData.MEMBER_DATA 
      : [fileData.MEMBER_DATA];

    console.log('🔍 Total de miembros encontrados:', members.length);

    // Transformar los datos
    const membersToInsert = members.map(member => {
      // Acceder a los valores numéricos correctamente
      const heightValue = member.HEIGHT ? parseFloat(member.HEIGHT._) : null;
      const widthValue = member.WIDTH ? parseFloat(member.WIDTH._) : null;
      const actualHeightValue = member.ACTUAL_HEIGHT ? parseFloat(member.ACTUAL_HEIGHT._) : null;
      const actualWidthValue = member.ACTUAL_WIDTH ? parseFloat(member.ACTUAL_WIDTH._) : null;
      const lengthValue = member.LENGTH ? parseFloat(member.LENGTH._) : null;

      return {
        member_id: member.MEMBER_ID,
        type: member.TYPE,
        name: member.NAME,
        description: member.DESCRIPTION,
        height: heightValue,
        width: widthValue,
        actual_height: actualHeightValue,
        actual_width: actualWidthValue,
        length: lengthValue,
        cut_member: member.CUT_MEMBER === 'YES'
      };
    });

    console.log('📝 Primer miembro a insertar:', membersToInsert[0]);
    console.log('📝 Total de miembros a insertar:', membersToInsert.length);

    // Insertar en Supabase
    const { data, error } = await supabase
      .from('members99')
      .insert(membersToInsert)
      .select();

    if (error) {
      console.error('❌ Error al insertar en Supabase:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'XML processed and saved', 
        inserted: membersToInsert.length,
        firstMember: membersToInsert[0] // Para verificar el formato de los datos
      }), 
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Error procesando XML:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}