const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const parties = await prisma.party.count();
    const jobcards = await prisma.jobcard.count();
    const jobworkChallans = await prisma.jobworkChallan.count();
    const machines = await prisma.machine.count();
    const items = await prisma.item.count();
    const challanItems = await prisma.challanItem.count();
    const inspections = await prisma.incomingInspection.count();

    console.log('=== FINAL DATA SUMMARY ===');
    console.log('Parties:', parties);
    console.log('Job Cards:', jobcards);
    console.log('Job Work Challans:', jobworkChallans);
    console.log('Machines:', machines);
    console.log('Items:', items);
    console.log('Challan Items:', challanItems);
    console.log('Inspections:', inspections);

    // Check status distribution
    const statusCounts = await prisma.jobcard.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    console.log('\n=== JOB CARD STATUS DISTRIBUTION ===');
    statusCounts.forEach(status => {
      console.log(`${status.status}: ${status._count.status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();