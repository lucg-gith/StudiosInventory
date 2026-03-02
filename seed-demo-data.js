import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDemoData() {
  console.log('Starting demo data seed...\n');

  try {
    // 1. Clean up existing data (FK-safe order)
    console.log('Clearing existing data...');
    await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('maintenance_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('equipment_units').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('equipment').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('Existing data cleared\n');

    // 2. Add Equipment (Citywire Studios real inventory)
    console.log('Adding equipment...');
    const equipment = [
      { name: 'Sony FX3', category: 'Camera', total_quantity: 2 },
      { name: 'Sony FX6', category: 'Camera', total_quantity: 4 },
      { name: 'H6', category: 'Audio', total_quantity: 1 },
      { name: 'Blue Sennheiser Handheld', category: 'Audio', total_quantity: 1 },
      { name: 'Sony 70-200', category: 'Lens', total_quantity: 1 },
      { name: 'Sigma 24-70', category: 'Lens', total_quantity: 1 },
    ];

    const { data: equipmentData, error: equipmentError } = await supabase
      .from('equipment')
      .insert(equipment)
      .select();

    if (equipmentError) throw equipmentError;
    console.log(`Added ${equipmentData.length} equipment types\n`);

    // 3. Add Equipment Units (exact counts per type)
    console.log('Adding equipment units...');
    const units = [];

    for (const eq of equipmentData) {
      for (let i = 1; i <= eq.total_quantity; i++) {
        units.push({
          equipment_id: eq.id,
          unit_number: `Unit ${i}`,
          current_status: 'available',
        });
      }
    }

    const { data: unitsData, error: unitsError } = await supabase
      .from('equipment_units')
      .insert(units)
      .select();

    if (unitsError) throw unitsError;
    console.log(`Added ${unitsData.length} equipment units\n`);

    // 4. Summary
    console.log('Seed complete! Equipment inventory:\n');
    for (const eq of equipmentData) {
      const unitCount = unitsData.filter(u => u.equipment_id === eq.id).length;
      console.log(`  ${eq.name} (${eq.category}) - ${unitCount} unit(s)`);
    }
    console.log('\nAll units set to "available". Open the app to start testing.');

  } catch (error) {
    console.error('Error seeding demo data:', error);
    process.exit(1);
  }
}

seedDemoData();
