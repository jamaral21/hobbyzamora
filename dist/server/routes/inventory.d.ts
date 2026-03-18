declare const router: import("express-serve-static-core").Router;
export declare function deductStockFIFO(productId: string, quantity: number, reference: string): Promise<{
    success: boolean;
    cost: number;
    error?: string;
}>;
export declare function returnStockFIFO(productId: string, quantity: number, unitCost: number, reference: string): Promise<{
    success: boolean;
    batchId: string;
}>;
export default router;
//# sourceMappingURL=inventory.d.ts.map