import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';

export interface FilterField {
    key: string;
    label: string;
    type: 'dropdown' | 'multiselect' | 'text';
    options?: { label: string; value: any }[];
    placeholder?: string;
    showClear?: boolean;
}

@Component({
    selector: 'app-unified-filter-panel',
    standalone: true,
    imports: [CommonModule, FormsModule, DropdownModule, MultiSelectModule],
    templateUrl: './unified-filter-panel.component.html',
    styleUrls: ['./unified-filter-panel.component.css']
})
export class UnifiedFilterPanelComponent {
    @Input() fields: FilterField[] = [];
    @Input() model: any = {};
    @Input() title: string = 'FILTER';

    @Output() apply = new EventEmitter<any>();
    @Output() reset = new EventEmitter<void>();
    @Output() close = new EventEmitter<void>();
    @Output() modelChange = new EventEmitter<any>();

    onModelChange() {
        this.modelChange.emit({ ...this.model });
    }

    onClose() {
        this.close.emit();
    }

    onReset() {
        // Reset all keys to null or 'All' depending on existing pattern
        Object.keys(this.model).forEach(key => {
            this.model[key] = 'All';
        });
        this.reset.emit();
    }

    onApply() {
        this.apply.emit({ ...this.model });
    }
}
