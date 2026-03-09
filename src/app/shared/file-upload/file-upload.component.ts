import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent {
  /** 
   * Whether multiple files can be selected.
   * Default: false (Single file mode)
   */
  @Input() multiple: boolean = false;

  /**
   * Accepted file types (e.g. "image/*", ".pdf").
   * Default: "image/*"
   */
  @Input() accept: string = "image/*";

  /**
   * Custom label for the upload section.
   * Default: "Product Image"
   */
  @Input() label: string = "Product Image";

  /**
   * Layout of the upload section.
   * 'column': Drop zone and list stacked (default).
   * 'row': Drop zone and list side-by-side.
   */
  @Input() layout: 'row' | 'column' = 'column';

  /**
   * Emits the list of currently selected files whenever it changes.
   * Returns File[] array (even if single mode, returns [File] or [])
   */
  @Output() filesSelected = new EventEmitter<File[]>();

  selectedFiles: File[] = [];
  uploadProgress: number = 0; // We simulate this for now as per original code

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.handleFiles(Array.from(files));
    }
  }

  onFileDropped(event: DragEvent) {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(Array.from(files));
    }
  }

  handleFiles(files: File[]) {
    if (this.multiple) {
      // Add unique files or just append? 
      // Usually users expect to add to existing list or replace. 
      // For now, let's append but check for duplicates might be overkill for simple usage.
      // Let's just append for now to be safe, or maybe replace? 
      // The original code was single file. 
      // Let's assume we append newly selected files to the list.
      this.selectedFiles = [...this.selectedFiles, ...files];
    } else {
      // Single mode - replace
      this.selectedFiles = [files[0]];
    }

    this.uploadProgress = 100; // Simulate immediate "upload" / readiness
    this.emitFiles();
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
    
    if (this.selectedFiles.length === 0) {
      this.uploadProgress = 0;
    }
    
    this.emitFiles();
  }

  emitFiles() {
    this.filesSelected.emit(this.selectedFiles);
  }
}
