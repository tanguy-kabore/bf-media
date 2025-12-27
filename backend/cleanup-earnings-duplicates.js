const mysql = require('mysql2/promise');

async function cleanupEarningsDuplicates() {
  let connection;
  try {
    console.log('🔌 Connexion à MySQL...\n');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'root',
      database: 'bf_media'
    });
    
    console.log('✅ Connecté à la base de données\n');
    
    // 1. Identifier les doublons de vues
    console.log('🔍 Recherche des doublons...\n');
    
    const [duplicates] = await connection.query(`
      SELECT 
        user_id,
        video_id,
        COUNT(*) as count,
        GROUP_CONCAT(id ORDER BY created_at DESC) as ids,
        GROUP_CONCAT(amount ORDER BY created_at DESC) as amounts,
        GROUP_CONCAT(created_at ORDER BY created_at DESC) as dates
      FROM user_earnings
      WHERE earning_type = 'view'
      GROUP BY user_id, video_id
      HAVING COUNT(*) > 1
    `);
    
    console.log(`📊 Trouvé ${duplicates.length} groupes de doublons\n`);
    
    if (duplicates.length === 0) {
      console.log('✅ Aucun doublon trouvé!');
      await connection.end();
      return;
    }
    
    let totalDuplicates = 0;
    let totalKept = 0;
    let totalDeleted = 0;
    
    // 2. Pour chaque groupe de doublons, garder le plus récent et supprimer les autres
    for (const dup of duplicates) {
      const ids = dup.ids.split(',');
      const amounts = dup.amounts.split(',');
      const dates = dup.dates.split(',');
      
      console.log(`📹 Vidéo ${dup.video_id}:`);
      console.log(`   ${dup.count} entrées trouvées`);
      
      // Le premier ID est le plus récent (ORDER BY created_at DESC)
      const keepId = ids[0];
      const keepAmount = amounts[0];
      const keepDate = dates[0];
      
      console.log(`   ✅ Garder: ${keepId} - ${keepAmount} FCFA - ${keepDate}`);
      
      // Supprimer les autres
      const deleteIds = ids.slice(1);
      
      for (let i = 0; i < deleteIds.length; i++) {
        console.log(`   ❌ Supprimer: ${deleteIds[i]} - ${amounts[i + 1]} FCFA - ${dates[i + 1]}`);
      }
      
      if (deleteIds.length > 0) {
        await connection.query(`
          DELETE FROM user_earnings
          WHERE id IN (${deleteIds.map(() => '?').join(',')})
        `, deleteIds);
        
        totalDeleted += deleteIds.length;
      }
      
      totalDuplicates += dup.count;
      totalKept += 1;
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 RÉSUMÉ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total d'entrées en double: ${totalDuplicates}`);
    console.log(`Entrées conservées: ${totalKept}`);
    console.log(`Entrées supprimées: ${totalDeleted}`);
    console.log('');
    
    // 3. Vérifier le résultat
    const [afterCleanup] = await connection.query(`
      SELECT 
        user_id,
        video_id,
        COUNT(*) as count
      FROM user_earnings
      WHERE earning_type = 'view'
      GROUP BY user_id, video_id
      HAVING COUNT(*) > 1
    `);
    
    if (afterCleanup.length === 0) {
      console.log('✅ Nettoyage terminé! Plus aucun doublon.\n');
    } else {
      console.log(`⚠️  Il reste ${afterCleanup.length} groupes de doublons.\n`);
    }
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

cleanupEarningsDuplicates();
