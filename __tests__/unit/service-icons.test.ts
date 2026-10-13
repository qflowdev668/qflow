import { serviceIconKind, serviceIconSrc } from "@/lib/service-icons"

describe("service icons", () => {
  it("maps each place type to its picture", () => {
    expect(serviceIconKind("clinic", "Netcare Clinic")).toBe("clinic")
    expect(serviceIconKind("clinic", "Chris Hani Hospital")).toBe("hospital")
    expect(serviceIconKind("bank")).toBe("bank")
    expect(serviceIconKind("government")).toBe("government")
    expect(serviceIconKind("other")).toBe("counter")
  })

  it("points at the public file", () => {
    expect(serviceIconSrc("bank", "ABSA")).toBe("/service-icons/bank.png")
  })
})