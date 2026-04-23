import { computeContractExcelParity } from "@/domain/excel-parity";
import { roundWeight, sum } from "@/domain/rounding";
import {
  bookingsSheetInputSchema,
  processingSheetInputSchema,
  staffingSheetInputSchema,
} from "@/domain/schemas";
import type {
  BookingsSheet,
  BookingEntry,
  CompanyConfiguration,
  Contract,
  ExecutionData,
  ProcessingSheet,
  Shipment,
  StaffingFinalRow,
  StaffingInstructionRow,
  StaffingSheet,
  VehicleKind,
} from "@/types/models";

function cleanOptional(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeNumber(value?: number | null): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function makeBookingEntry(
  rowNo: number,
  vehicleType: VehicleKind,
  vehicleNo?: number,
): BookingEntry {
  return {
    rowNo,
    vehicleNo,
    vehicleType,
  };
}

function copySharedDriverFields(source: BookingEntry, target: BookingEntry): BookingEntry {
  return {
    ...target,
    driverName: source.driverName,
    driverPhoneNo: source.driverPhoneNo,
    djiboutiPhoneNo: source.djiboutiPhoneNo,
    licenseNo: source.licenseNo,
  };
}

export function syncBookingEntryPairs(entries: BookingEntry[]): BookingEntry[] {
  return entries.map((entry, index, allEntries) => {
    if (entry.vehicleType !== "TRAILER") {
      return entry;
    }

    const truckEntry = allEntries[index - 1];
    if (!truckEntry || truckEntry.vehicleType !== "TRUCK") {
      return entry;
    }

    return copySharedDriverFields(truckEntry, entry);
  });
}

export function appendVehiclePair(entries: BookingEntry[]): BookingEntry[] {
  const nextVehicleNo = Math.max(0, ...entries.map((entry) => entry.vehicleNo ?? 0)) + 1;
  const nextRowNo = Math.max(0, ...entries.map((entry) => entry.rowNo)) + 1;

  return [
    ...entries,
    makeBookingEntry(nextRowNo, "TRUCK", nextVehicleNo),
    makeBookingEntry(nextRowNo + 1, "TRAILER"),
  ];
}

export function removeLastVehiclePair(entries: BookingEntry[]): BookingEntry[] {
  if (entries.length <= 2) {
    return entries;
  }

  return entries.slice(0, Math.max(0, entries.length - 2));
}

export function defaultBookingEntries(): BookingEntry[] {
  return appendVehiclePair([]);
}

export function defaultBookingsSheet(orgId: string, contractId: string): BookingsSheet {
  return {
    orgId,
    contractId,
    entries: defaultBookingEntries(),
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

export function normalizeBookingsPayload(input: unknown) {
  const parsed = bookingsSheetInputSchema.parse(input);
  const syncedEntries = syncBookingEntryPairs(parsed.bookings.entries);

  return {
    bookings: {
      orgId: parsed.orgId,
      contractId: parsed.contractId,
      bookingNumber: cleanOptional(parsed.bookings.bookingNumber),
      shippingLine: cleanOptional(parsed.bookings.shippingLine),
      vesselName: cleanOptional(parsed.bookings.vesselName),
      voyageNo: cleanOptional(parsed.bookings.voyageNo),
      freeDays: cleanOptional(parsed.bookings.freeDays),
      billOfLadingNumber: cleanOptional(parsed.bookings.billOfLadingNumber),
      entries: syncedEntries.map((entry) => ({
        rowNo: entry.rowNo,
        vehicleNo: entry.vehicleNo,
        vehicleType: entry.vehicleType,
        plateNo: cleanOptional(entry.plateNo),
        driverName: cleanOptional(entry.driverName),
        driverPhoneNo: cleanOptional(entry.driverPhoneNo),
        djiboutiPhoneNo: cleanOptional(entry.djiboutiPhoneNo),
        licenseNo: cleanOptional(entry.licenseNo),
        containerNumber: cleanOptional(entry.containerNumber),
        sealNumber: cleanOptional(entry.sealNumber),
        tareWeightKg: normalizeNumber(entry.tareWeightKg),
      })),
    } satisfies Omit<BookingsSheet, "createdAt" | "updatedAt">,
  };
}

function toInstructionRow(entry: BookingEntry): StaffingInstructionRow {
  return {
    rowNo: entry.rowNo,
    vehicleNo: entry.vehicleNo,
    vehicleType: entry.vehicleType,
    plateNo: entry.plateNo,
    driverName: entry.driverName,
    driverPhoneNo: entry.driverPhoneNo,
    licenseNo: entry.licenseNo,
    containerNumber: entry.containerNumber,
    sealNumber: entry.sealNumber,
    tareWeightKg: entry.tareWeightKg,
  };
}

export function buildDefaultStaffingInstructionRows(bookings?: BookingsSheet): StaffingInstructionRow[] {
  if (!bookings || bookings.entries.length === 0) {
    return defaultBookingEntries().map(toInstructionRow);
  }

  return syncBookingEntryPairs(bookings.entries).map(toInstructionRow);
}

export function syncStaffingInstructionRows(
  bookings: BookingsSheet | undefined,
  existingRows: StaffingInstructionRow[] = [],
): StaffingInstructionRow[] {
  const baseRows = buildDefaultStaffingInstructionRows(bookings);
  const existingByRowNo = new Map(existingRows.map((row) => [row.rowNo, row]));

  return baseRows.map((row) => {
    const existing = existingByRowNo.get(row.rowNo);
    if (!existing) {
      return row;
    }

    return {
      ...row,
      sealNumber: existing.sealNumber ?? row.sealNumber,
      sealNumberV2: existing.sealNumberV2,
      certNumber: existing.certNumber,
      certNumberV2: existing.certNumberV2,
      firstWeightKg: existing.firstWeightKg,
      secondWeightKg: existing.secondWeightKg,
      netWeightKg: existing.netWeightKg,
      doNumber: existing.doNumber,
    };
  });
}

export function normalizeStaffingPayload(input: unknown) {
  const parsed = staffingSheetInputSchema.parse(input);

  return {
    staffing: {
      orgId: parsed.orgId,
      contractId: parsed.contractId,
      instructionRows: parsed.staffing.instructionRows.map((row) => ({
        rowNo: row.rowNo,
        vehicleNo: row.vehicleNo,
        vehicleType: row.vehicleType,
        plateNo: cleanOptional(row.plateNo),
        driverName: cleanOptional(row.driverName),
        driverPhoneNo: cleanOptional(row.driverPhoneNo),
        licenseNo: cleanOptional(row.licenseNo),
        containerNumber: cleanOptional(row.containerNumber),
        sealNumber: cleanOptional(row.sealNumber),
        sealNumberV2: cleanOptional(row.sealNumberV2),
        certNumber: cleanOptional(row.certNumber),
        certNumberV2: cleanOptional(row.certNumberV2),
        tareWeightKg: normalizeNumber(row.tareWeightKg),
        firstWeightKg: normalizeNumber(row.firstWeightKg),
        secondWeightKg: normalizeNumber(row.secondWeightKg),
        netWeightKg: normalizeNumber(row.netWeightKg),
        doNumber: cleanOptional(row.doNumber),
      })),
    } satisfies Omit<StaffingSheet, "createdAt" | "updatedAt">,
  };
}

export function deriveFinalStaffingRows(staffing?: StaffingSheet): StaffingFinalRow[] {
  if (!staffing) {
    return [];
  }

  return staffing.instructionRows.map((row) => ({
    rowNo: row.rowNo,
    vehicleNo: row.vehicleNo,
    vehicleType: row.vehicleType,
    plateNo: row.plateNo,
    driverName: row.driverName,
    driverPhoneNo: row.driverPhoneNo,
    licenseNo: row.licenseNo,
    containerNumber: row.containerNumber,
    sealNumber: row.sealNumberV2 || row.sealNumber || "-",
    certNumber: row.certNumberV2 || row.certNumber || "-",
    tareWeightKg: row.tareWeightKg,
    firstWeightKg: row.firstWeightKg,
    secondWeightKg: row.secondWeightKg,
    netWeightKg: row.netWeightKg,
    doNumber: row.doNumber,
  }));
}

export function normalizeProcessingPayload(input: unknown) {
  const parsed = processingSheetInputSchema.parse(input);

  return {
    processing: {
      orgId: parsed.orgId,
      contractId: parsed.contractId,
      moisturePercent: parsed.processing.moisturePercent,
      stationName: parsed.processing.stationName.trim(),
      stationNameLocal: cleanOptional(parsed.processing.stationNameLocal),
      stationAddress: parsed.processing.stationAddress.trim(),
    } satisfies Omit<ProcessingSheet, "createdAt" | "updatedAt">,
  };
}

export function defaultProcessingSheet(orgId: string, contractId: string): ProcessingSheet {
  return {
    orgId,
    contractId,
    moisturePercent: 0,
    stationName: "",
    stationAddress: "",
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

export function collectSealOptions(bookings?: BookingsSheet): string[] {
  if (!bookings) {
    return [];
  }

  return Array.from(new Set(
    bookings.entries
      .map((entry) => entry.sealNumber)
      .filter((value): value is string => Boolean(value && value.trim())),
  ));
}

export function buildExecutionShipment(
  contract: Contract,
  companyConfiguration: CompanyConfiguration | undefined,
  executionData?: ExecutionData,
): Shipment {
  const parity = computeContractExcelParity(contract.terms, companyConfiguration);
  const bookings = executionData?.bookings;
  const finalRows = executionData?.staffing?.finalRows ?? [];
  const rowsWithContainers = finalRows.filter((row) => row.containerNumber);
  const totalTareWeightKg = roundWeight(sum(finalRows.map((row) => row.tareWeightKg ?? 0)));
  const totalNetWeightKg = roundWeight(sum(finalRows.map((row) => row.netWeightKg ?? 0)));
  const inferredNetWeightKg = totalNetWeightKg > 0 ? totalNetWeightKg : parity.quantityKg;
  const inferredTareWeightKg = totalTareWeightKg > 0 ? totalTareWeightKg : roundWeight(sum(
    (bookings?.entries ?? []).map((entry) => entry.tareWeightKg ?? 0),
  ));
  const totalGrossWeightKg = roundWeight(inferredNetWeightKg + inferredTareWeightKg);

  return {
    id: "execution-derived",
    orgId: contract.orgId,
    contractId: contract.id,
    status: rowsWithContainers.length > 0 ? "ready" : "draft",
    vessel: bookings?.vesselName,
    voyageNo: bookings?.voyageNo,
    bookingReference: bookings?.bookingNumber,
    bookingLines: finalRows
      .filter((row) => row.containerNumber || row.sealNumber || row.tareWeightKg || row.netWeightKg)
      .map((row, index) => ({
        lineNo: index + 1,
        truckNumber: row.plateNo,
        containerNumber: row.containerNumber,
        sealNumber: row.sealNumber,
        bags: rowsWithContainers.length > 0
          ? Math.round(contract.terms.quantityBags / rowsWithContainers.length)
          : contract.terms.quantityBags,
        grossWeightKg: roundWeight((row.netWeightKg ?? 0) + (row.tareWeightKg ?? 0)),
        tareWeightKg: row.tareWeightKg ?? 0,
        netWeightKg: row.netWeightKg ?? 0,
      })),
    totals: {
      totalBags: contract.terms.quantityBags,
      totalGrossWeightKg,
      totalTareWeightKg: inferredTareWeightKg,
      totalNetWeightKg: inferredNetWeightKg,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function hydrateExecutionData(executionData?: {
  bookings?: BookingsSheet;
  staffing?: StaffingSheet;
  processing?: ProcessingSheet;
}): ExecutionData {
  const syncedInstructionRows = syncStaffingInstructionRows(
    executionData?.bookings,
    executionData?.staffing?.instructionRows,
  );

  return {
    bookings: executionData?.bookings,
    staffing: executionData?.staffing
      ? {
          ...executionData.staffing,
          instructionRows: syncedInstructionRows,
          finalRows: deriveFinalStaffingRows({
            ...executionData.staffing,
            instructionRows: syncedInstructionRows,
          }),
        }
      : undefined,
    processing: executionData?.processing,
  };
}

export function vehicleKindOptions(): VehicleKind[] {
  return ["TRUCK", "TRAILER"];
}
