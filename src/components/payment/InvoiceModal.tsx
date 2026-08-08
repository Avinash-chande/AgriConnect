import React from 'react';
import { X, Printer, ShieldCheck, Download } from 'lucide-react';

interface InvoiceModalProps {
  invoice: any;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const user = invoice.user || {};
  const items = invoice.items || [];
  const issuedDate = new Date(invoice.issuedAt || invoice.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 print:shadow-none print:border-none print:w-full print:max-w-none print:p-0">
        {/* Modal Actions */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">Official Tax Receipt</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl transition"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Document Header */}
        <div className="border-b border-slate-200 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl font-extrabold text-emerald-800 tracking-tight">AgriConnect</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">GST INVOICE</span>
              </div>
              <p className="text-xs text-slate-500">AgriConnect Employment Technologies Ltd.</p>
              <p className="text-xs text-slate-500">GSTIN: 27AAAAA0000A1Z5</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900">INVOICE: #{invoice.invoiceNumber}</p>
              <p className="text-xs text-slate-500 mt-1">Date: {issuedDate}</p>
              <p className="text-xs text-slate-500">Status: <span className="font-semibold text-emerald-600 uppercase">{invoice.status}</span></p>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-xs text-slate-700 grid grid-cols-2 gap-4">
          <div>
            <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1 text-slate-400">Billed To</p>
            <p className="font-bold text-slate-800 text-sm">{user.name || user.fullName || 'Valued Customer'}</p>
            <p>{user.email}</p>
            <p>{user.mobile || user.phone}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1 text-slate-400">Payment Reference</p>
            <p className="font-medium text-slate-800">Txn ID: {invoice.transaction?.transactionId || invoice.transaction || 'N/A'}</p>
            <p>Currency: {invoice.currency || 'INR'}</p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="py-3 px-2">Item Description</th>
                <th className="py-3 px-2 text-center">Qty</th>
                <th className="py-3 px-2 text-right">Unit Price</th>
                <th className="py-3 px-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-3 px-2 font-medium">{item.description}</td>
                  <td className="py-3 px-2 text-center">{item.quantity}</td>
                  <td className="py-3 px-2 text-right">₹{item.unitPrice?.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-2 text-right font-semibold">₹{item.amount?.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Totals */}
        <div className="border-t border-slate-200 pt-4 text-xs space-y-1.5 max-w-xs ml-auto text-slate-700">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{(invoice.amount - (invoice.tax || 0)).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>GST (18% Included):</span>
            <span>₹{(invoice.tax || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2 mt-2">
            <span>Total Paid:</span>
            <span className="text-emerald-700">₹{invoice.amount?.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400">
          Thank you for choosing AgriConnect. This is a computer-generated tax invoice. No signature required.
        </div>
      </div>
    </div>
  );
};
