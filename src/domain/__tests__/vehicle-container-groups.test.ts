import { combineVehicleField, groupStaffingRowsByVehicle, vehicleGroupsWithContainers } from "@/domain/vehicle-container-groups";
import type { StaffingFinalRow } from "@/types/models";

function row(partial: Partial<StaffingFinalRow> & Pick<StaffingFinalRow, "rowNo" | "vehicleType">): StaffingFinalRow {
  return {
    sealNumber: "-",
    certNumber: "-",
    ...partial,
  };
}

describe("vehicle-container-groups", () => {
  it("groups truck and trailer into one vehicle", () => {
    const rows = [
      row({ rowNo: 1, vehicleNo: 1, vehicleType: "TRUCK", containerNumber: "C1", sealNumber: "S1" }),
      row({ rowNo: 2, vehicleType: "TRAILER", containerNumber: "C2", sealNumber: "S2" }),
      row({ rowNo: 3, vehicleNo: 2, vehicleType: "TRUCK", containerNumber: "C3", sealNumber: "S3" }),
      row({ rowNo: 4, vehicleType: "TRAILER", containerNumber: "C4", sealNumber: "S4" }),
    ];

    const groups = vehicleGroupsWithContainers(rows);
    expect(groups).toHaveLength(2);
    expect(combineVehicleField(groups[0].truck?.containerNumber, groups[0].trailer?.containerNumber)).toBe("C1 / C2");
    expect(combineVehicleField(groups[1].truck?.sealNumber, groups[1].trailer?.sealNumber)).toBe("S3 / S4");
  });

  it("ignores vehicles with no containers", () => {
    const rows = [
      row({ rowNo: 1, vehicleNo: 1, vehicleType: "TRUCK" }),
      row({ rowNo: 2, vehicleType: "TRAILER" }),
    ];

    expect(vehicleGroupsWithContainers(rows)).toHaveLength(0);
    expect(groupStaffingRowsByVehicle(rows)).toHaveLength(1);
  });
});
