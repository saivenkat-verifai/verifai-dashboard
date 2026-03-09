import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.css']
})
export class PaginationComponent implements OnChanges {
  @Input() currentPage: number = 1;
  @Input() totalItems: number = 0;
  @Input() pageSize: number = 10;

  @Input() pageSizeOptions: number[] = [5, 10, 15, 20, 50];

  /** Mode: 'server' (default) expects totalItems and emits pageChange. 'client' expects allData and emits paginatedData. */
  @Input() mode: 'client' | 'server' = 'server';
  /** Data source for client-side pagination */
  @Input() allData: any[] = [];
  
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() paginatedData = new EventEmitter<any[]>();

  totalPages: number = 1;
  Math = Math;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['totalItems'] || changes['pageSize']) {
      this.calculateTotalPages();
    }
    
    if (this.mode === 'client' && (changes['allData'] || changes['pageSize'] || changes['currentPage'])) {
        this.handleClientSidePagination();
    }
  }

  handleClientSidePagination() {
      if (!this.allData) return;
      
      this.totalItems = this.allData.length;
      this.calculateTotalPages();

      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = Math.min(startIndex + this.pageSize, this.totalItems);
      const slicedData = this.allData.slice(startIndex, endIndex);
      
      this.paginatedData.emit(slicedData);
  }

  calculateTotalPages() {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize) || 1;
    // Validate current page
    // Validate current page
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
        this.onPageInput(this.totalPages); // Emit max page
    }
  }
  
  onPageInput(pageOverride?: number) {
      let targetPage = pageOverride !== undefined ? pageOverride : this.currentPage;
      
      if (targetPage < 1) targetPage = 1;
      if (targetPage > this.totalPages) targetPage = this.totalPages;

      // Update local state immediately for client mode responsiveness
      this.currentPage = targetPage;
      this.pageChange.emit(this.currentPage);
      
      if (this.mode === 'client') {
          this.handleClientSidePagination();
      }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.onPageInput(this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.onPageInput(this.currentPage - 1);
    }
  }

  firstPage() {
    this.onPageInput(1);
  }

  lastPage() {
    this.onPageInput(this.totalPages);
  }

  onPageSizeSelect(size: number) {
    this.pageSize = size; // Update local
    this.pageSizeChange.emit(size);
    if (this.mode === 'client') {
        this.currentPage = 1;
        this.handleClientSidePagination();
    }
  }
}
