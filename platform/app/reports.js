import { listReports } from '@openpeeps/core/reports';


const reports = await listReports();

console.log(reports);