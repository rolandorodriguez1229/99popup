import { supabase } from '@/lib/supabase';
import { parseStringPromise } from 'xml2js';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
    }

    // Obtener el job number de la ruta del archivo
    const filePath = file.webkitRelativePath || file.name;
    const pathParts = filePath.split('/');
    const jobNumber = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'unknown';
    const fileName = pathParts[pathParts.length - 1];

    console.log('📁 Procesando archivo:', fileName, 'del trabajo:', jobNumber);

    // Primero crear el bundle
    const { data: bundleData, error: bundleError } = await supabase
      .from('bundle99')
      .insert({
        job_number: jobNumber,
        bundle_name: fileName.replace('.xml', '') // Eliminar la extensión .xml
      })
      .select()
      .single();

    if (bundleError) {
      console.error('❌ Error al crear bundle:', bundleError);
      return new Response(JSON.stringify({ error: bundleError.message }), { status: 500 });
    }

    const bundleId = bundleData.id;
    console.log('✅ Bundle creado con ID:', bundleId);

    // Leer y parsear el XML
    const fileBuffer = await file.arrayBuffer();
    const xmlData = new TextDecoder().decode(fileBuffer);
    
    const result = await parseStringPromise(xmlData, {
      explicitArray: false,
      mergeAttrs: true
    });

    const fileData = result.VIRTEK_BUILDING_MATERIAL_MARKUP_LANGUAGE_FILE;
    
    if (!fileData.MEMBER_DATA) {
      return new Response(JSON.stringify({ error: 'No MEMBER_DATA found in XML' }), { status: 400 });
    }

    const members = Array.isArray(fileData.MEMBER_DATA) 
      ? fileData.MEMBER_DATA 
      : [fileData.MEMBER_DATA];

    // Transformar los datos e incluir el bundle_id
    const membersToInsert = members.map(member => ({
      bundle_id: bundleId, // Agregar la referencia al bundle
      member_id: member.MEMBER_ID,
      type: member.TYPE,
      name: member.NAME,
      description: member.DESCRIPTION,
      height: member.HEIGHT ? parseFloat(member.HEIGHT._) : null,
      width: member.WIDTH ? parseFloat(member.WIDTH._) : null,
      actual_height: member.ACTUAL_HEIGHT ? parseFloat(member.ACTUAL_HEIGHT._) : null,
      actual_width: member.ACTUAL_WIDTH ? parseFloat(member.ACTUAL_WIDTH._) : null,
      length: member.LENGTH ? parseFloat(member.LENGTH._) : null,
      cut_member: member.CUT_MEMBER === 'YES'
    }));

    // Insertar los miembros
    const { data: membersData, error: membersError } = await supabase
      .from('members99')
      .insert(membersToInsert)
      .select();

    if (membersError) {
      console.error('❌ Error al insertar miembros:', membersError);
      return new Response(JSON.stringify({ error: membersError.message }), { status: 500 });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Bundle and members saved successfully',
        bundle: bundleData,
        membersCount: membersToInsert.length
      }), 
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Error general:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}