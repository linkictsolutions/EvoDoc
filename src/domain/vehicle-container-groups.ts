import type { StaffingFinalRow } from "@/types/models";

export type VehicleContainerGroup = {
  vehicleNo: number;
  truck?: StaffingFinalRow;
  trailer?: StaffingFinalRow;
};

function clean(value?: string): string {
  return value?.trim() ?? "";
}

export function groupStaffingRowsByVehicle(staffingRows: StaffingFinalRow[]): VehicleContainerGroup[] {
  const groups: VehicleContainerGroup[] = [];
  let current: VehicleContainerGroup | null = null;

  for (const row of staffingRows) {
    if (row.vehicleType === "TRUCK") {
      if (current) {
        groups.push(current);
      }

      current = {
        vehicleNo: row.vehicleNo ?? groups.length + 1,
        truck: row,
      };
      continue;
    }

    if (row.vehicleType === "TRAILER" && current) {
      current.trailer = row;
    }
  }

  if (current) {
    groups.push(current);
  }

  return groups;
}

export function combineVehicleField(
  truckValue?: string,
  trailerValue?: string,
  separator = " / ",
): string {
  const parts = [clean(truckValue), clean(trailerValue)].filter(Boolean);
  return parts.join(separator);
}

export function countVehicleGroupsWithContainers(staffingRows: StaffingFinalRow[]): number {
  return groupStaffingRowsByVehicle(staffingRows).filter((group) => (
    clean(group.truck?.containerNumber).length > 0
    || clean(group.trailer?.containerNumber).length > 0
  )).length;
}

export function vehicleGroupsWithContainers(staffingRows: StaffingFinalRow[]): VehicleContainerGroup[] {
  return groupStaffingRowsByVehicle(staffingRows).filter((group) => (
    clean(group.truck?.containerNumber).length > 0
    || clean(group.trailer?.containerNumber).length > 0
  ));
}
