interface SubmitButtonProps {
  children: React.ReactNode;
  loading?: boolean;
}

export default function SubmitButton({ children, loading }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`w-full py-3 rounded-xl font-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 
        ${loading 
          ? 'bg-slate-300 cursor-not-allowed text-slate-500' 
          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100'
        }`}
    >
      {loading ? (
        <>
          <span className="animate-spin text-xl">⏳</span>
          Уншиж байна...
        </>
      ) : (
        children
      )}
    </button>
  );
}
