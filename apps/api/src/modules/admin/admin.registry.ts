import { academicYearResource } from '../academic-years/academic-year.resource.js';
import { eventResource } from '../calendar/event.resource.js';
import { departmentResource } from '../departments/department.resource.js';
import { examResource } from '../examinations/exam.resource.js';
import { facultyResource } from '../faculty/faculty.resource.js';
import { feeCategoryResource } from '../fees/fee-category.resource.js';
import { feeResource } from '../fees/fee.resource.js';
import { parentResource } from '../parents/parent.resource.js';
import { companyResource } from '../placements/company.resource.js';
import { placementDriveResource } from '../placements/drive.resource.js';
import { programmeResource } from '../programmes/programme.resource.js';
import { sectionResource } from '../sections/section.resource.js';
import { studentResource } from '../students/student.resource.js';
import { subjectResource } from '../subjects/subject.resource.js';
import { timetableResource } from '../timetable/timetable.resource.js';
import { userResource } from '../users/user.resource.js';
import type { ResourceDefinition } from '../../shared/resource/resource.types.js';

/**
 * Every master-data resource the administration screens can manage. Adding an
 * entity means adding one definition here — the routes, pagination, search,
 * CSV export, archive workflow and audit trail all come from the framework.
 */
export const MASTER_DATA_RESOURCES: ResourceDefinition[] = [
  departmentResource,
  programmeResource,
  academicYearResource,
  sectionResource,
  subjectResource,
  studentResource,
  facultyResource,
  parentResource,
  userResource,
  timetableResource,
  feeCategoryResource,
  feeResource,
  examResource,
  eventResource,
  companyResource,
  placementDriveResource,
];

export const resourceByName = (name: string): ResourceDefinition | undefined => MASTER_DATA_RESOURCES.find((r) => r.name === name);
