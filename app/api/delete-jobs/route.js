import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { jobNumbers, bundleNames, deleteAll } = await req.json();
    
    // Opción para eliminar todos los trabajos
    if (deleteAll) {
      // Primero eliminamos todos los miembros
      const { error: membersError } = await supabase
        .from('members99')
        .delete()
        .neq('id', 0); // Truco para eliminar todos los registros
      
      if (membersError) {
        console.error('Error al eliminar todos los miembros:', membersError);
        return NextResponse.json({ error: membersError.message }, { status: 500 });
      }
      
      // Luego eliminamos todos los bundles
      const { error: bundlesError } = await supabase
        .from('bundle99')
        .delete()
        .neq('id', 0); // Truco para eliminar todos los registros
      
      if (bundlesError) {
        console.error('Error al eliminar todos los bundles:', bundlesError);
        return NextResponse.json({ error: bundlesError.message }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Todos los trabajos han sido eliminados correctamente' 
      });
    }
    
    // Eliminar trabajos específicos
    if (jobNumbers && jobNumbers.length > 0) {
      // Primero obtenemos los IDs de los bundles que queremos eliminar
      const { data: bundlesToDelete, error: fetchError } = await supabase
        .from('bundle99')
        .select('id')
        .in('job_number', jobNumbers);
      
      if (fetchError) {
        console.error('Error al obtener bundles para eliminar:', fetchError);
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
      }
      
      if (bundlesToDelete && bundlesToDelete.length > 0) {
        const bundleIds = bundlesToDelete.map(b => b.id);
        
        // Eliminar miembros asociados a estos bundles
        const { error: membersError } = await supabase
          .from('members99')
          .delete()
          .in('bundle_id', bundleIds);
        
        if (membersError) {
          console.error('Error al eliminar miembros:', membersError);
          return NextResponse.json({ error: membersError.message }, { status: 500 });
        }
        
        // Eliminar los bundles
        const { error: bundlesError } = await supabase
          .from('bundle99')
          .delete()
          .in('id', bundleIds);
        
        if (bundlesError) {
          console.error('Error al eliminar bundles:', bundlesError);
          return NextResponse.json({ error: bundlesError.message }, { status: 500 });
        }
      }
    }
    
    // Eliminar bundles específicos
    if (bundleNames && bundleNames.length > 0) {
      // Primero obtenemos los IDs de los bundles que queremos eliminar
      const { data: bundlesToDelete, error: fetchError } = await supabase
        .from('bundle99')
        .select('id')
        .in('bundle_name', bundleNames);
      
      if (fetchError) {
        console.error('Error al obtener bundles para eliminar:', fetchError);
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
      }
      
      if (bundlesToDelete && bundlesToDelete.length > 0) {
        const bundleIds = bundlesToDelete.map(b => b.id);
        
        // Eliminar miembros asociados a estos bundles
        const { error: membersError } = await supabase
          .from('members99')
          .delete()
          .in('bundle_id', bundleIds);
        
        if (membersError) {
          console.error('Error al eliminar miembros:', membersError);
          return NextResponse.json({ error: membersError.message }, { status: 500 });
        }
        
        // Eliminar los bundles
        const { error: bundlesError } = await supabase
          .from('bundle99')
          .delete()
          .in('id', bundleIds);
        
        if (bundlesError) {
          console.error('Error al eliminar bundles:', bundlesError);
          return NextResponse.json({ error: bundlesError.message }, { status: 500 });
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Trabajos eliminados correctamente' 
    });
    
  } catch (error) {
    console.error('Error al eliminar trabajos:', error);
    return NextResponse.json({ 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    }, { status: 500 });
  }
} 