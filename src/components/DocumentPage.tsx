import { ReactNode } from 'react';

interface DocumentPageProps {
  children?: ReactNode;
  pageNumber?: number;
  showPageNumber?: boolean;
}

export default function DocumentPage({ children, pageNumber, showPageNumber = true }: DocumentPageProps) {

  return (
    <div className="page relative">
      {/* Content area — clipped to page boundaries */}
      <div className="page-content" style={{ overflow: 'hidden' }}>
        {children}
      </div>

      {/* Footer — page number (never clipped) */}
      {pageNumber !== undefined && showPageNumber && (

        <div
          className="absolute left-0 right-0 text-center text-xs text-gray-500 pointer-events-none"
          style={{ bottom: '12mm' }}
        >
          {pageNumber}
        </div>
      )}
    </div>
  );
}
