import { supabase } from '@/lib/supabase';
import { parseStringPromise } from 'xml2js';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const replaceExisting = formData.get('replaceExisting') === 'true';
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
    }

    const filePath = file.webkitRelativePath || file.name;
    const pathParts = filePath.split('/');
    const jobNumber = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'unknown';
    const fileName = pathParts[pathParts.length - 1];
    const bundleName = fileName.replace('.xml', '');

    // Verificar si existe la combinación específica de trabajo y bundle
    const { data: existingBundle, error: checkError } = await supabase
      .from('bundle99')
      .select('id')
      .eq('job_number', jobNumber)
      .eq('bundle_name', bundleName)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return new Response(JSON.stringify({ error: checkError.message }), { status: 500 });
    }

    if (existingBundle && !replaceExisting) {
      return new Response(JSON.stringify({ 
        status: 'exists',
        jobNumber: jobNumber,
        bundleName: bundleName
      }), { status: 409 });
    }

    // Si existe y queremos reemplazar, primero eliminamos los miembros asociados
    if (existingBundle && replaceExisting) {
      // Primero eliminamos los miembros asociados
      const { error: deleteMembersError } = await supabase
        .from('members99')
        .delete()
        .eq('bundle_id', existingBundle.id);

      if (deleteMembersError) {
        return new Response(JSON.stringify({ error: deleteMembersError.message }), { status: 500 });
      }

      // Luego eliminamos el bundle
      const { error: deleteBundleError } = await supabase
        .from('bundle99')
        .delete()
        .eq('id', existingBundle.id);

      if (deleteBundleError) {
        return new Response(JSON.stringify({ error: deleteBundleError.message }), { status: 500 });
      }
    }

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

    // Crear el nuevo bundle
    const { data: bundleData, error: bundleError } = await supabase
      .from('bundle99')
      .insert({
        job_number: jobNumber,
        bundle_name: bundleName
      })
      .select()
      .single();

    if (bundleError) {
      return new Response(JSON.stringify({ error: bundleError.message }), { status: 500 });
    }

    const bundleId = bundleData.id;

    // Procesar los miembros
    const members = Array.isArray(fileData.MEMBER_DATA) 
      ? fileData.MEMBER_DATA 
      : [fileData.MEMBER_DATA];

    const membersToInsert = members.map(member => ({
      bundle_id: bundleId,
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

    const { error: membersError } = await supabase
      .from('members99')
      .insert(membersToInsert);

    if (membersError) {
      // Si hay error al insertar miembros, eliminamos el bundle creado
      await supabase
        .from('bundle99')
        .delete()
        .eq('id', bundleId);
        
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