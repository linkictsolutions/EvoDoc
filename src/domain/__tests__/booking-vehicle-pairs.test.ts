import { appendVehiclePair, removeVehiclePairAt, syncBookingEntryPairs } from "@/domain/execution";

describe("booking vehicle pairs", () => {
  it("does not sync container type from truck to trailer", () => {
    const entries = appendVehiclePair([]);
    entries[0].containerType = "20FT (FCL)";
    entries[1].containerType = "40FT (FCL)";

    const synced = syncBookingEntryPairs(entries);
    expect(synced[0].containerType).toBe("20FT (FCL)");
    expect(synced[1].containerType).toBe("40FT (FCL)");
  });

  it("removes a specific vehicle pair", () => {
    let entries = appendVehiclePair([]);
    entries = appendVehiclePair(entries);
    expect(entries).toHaveLength(4);

    const next = removeVehiclePairAt(entries, 0);
    expect(next).toHaveLength(2);
    expect(next[0].vehicleNo).toBe(2);
  });
});
