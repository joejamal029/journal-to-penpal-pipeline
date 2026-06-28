import os
import re
from datetime import datetime
import tkinter as tk
from tkinter import filedialog, messagebox

# ----------------- CONFIGURATION (Set via GUI) -----------------
SOURCE_FILE = None
ROOT_DIR = None

# ----------------- REGEX PATTERNS -----------------
# STAGE 1: Regular Journal Entries
DATE_PATTERN_STAGE1 = re.compile(r'^###\s+(\w{3}\s+\w{3}\s+\d{1,2},\s+\d{4})')
STOP_STAGE1 = re.compile(r'^##\s*notes', re.IGNORECASE)

# STAGE 2: Notes
CATEGORY_PATTERN_STAGE2 = re.compile(r'^##\s+(?!#)(.*)')
DATE_PATTERN_STAGE2 = re.compile(r'^(\w{3}\s+\w{3}\s+\d{1,2},\s+\d{4})')
STOP_STAGE2 = re.compile(r'^##\s*gems', re.IGNORECASE)

# STAGE 3: Groups (Thoughts, Quotes, etc.)
CATEGORY_PATTERN_STAGE3 = re.compile(r'^###\s+(?!.*, \d{4})(.*)')
STOP_STAGE3 = re.compile(r'^##\s*ideas', re.IGNORECASE)

# STAGE 4: Ideas
DATE_PATTERN_STAGE4 = re.compile(r'^\*(\w{3}\s+\w{3}\s+\d{1,2},\s+\d{4})\*')
ELABORATE_PATTERN = re.compile(r'^_elaborate:_\s*(.*)', re.IGNORECASE)
STOP_STAGE4 = re.compile(r'^##\s*stop', re.IGNORECASE)

# ----------------- STATE MODES -----------------
STAGE_1_JOURNAL = 1
STAGE_2_NOTES = 2
STAGE_3_GROUPS = 3
STAGE_4_IDEAS = 4

def get_target_path(dt):
    year_folder = dt.strftime('%Y')
    month_folder = dt.strftime('%B')
    filename = f"{dt.strftime('%B')} {dt.strftime('%d').lstrip('0')}, {dt.strftime('%a')}.md"
    target_dir = os.path.join(ROOT_DIR, year_folder, month_folder)
    os.makedirs(target_dir, exist_ok=True)
    return os.path.join(target_dir, filename)

def save_stage1_entry(dt, content_lines):
    path = get_target_path(dt)
    new_header = dt.strftime('### %B %d, %a, %Y')
    full_text = new_header + "\n" + "\n".join(content_lines).strip()
    
    try:
        if os.path.exists(path):
            with open(path, 'a', encoding='utf-8') as f:
                f.write("\n\n" + full_text)
        else:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(full_text)
    except OSError as e:
        print(f"Error writing to {path}: {e}")

def append_block(dt, heading, content_lines):
    path = get_target_path(dt)
    block_text = f"\n\n{heading}\n" + "\n".join(content_lines).strip()
    
    try:
        if os.path.exists(path):
            with open(path, 'a', encoding='utf-8') as f:
                f.write(block_text)
        else:
            file_header = dt.strftime('### %B %d, %a, %Y')
            with open(path, 'w', encoding='utf-8') as f:
                f.write(file_header + block_text)
    except OSError as e:
        print(f"Error writing to {path}: {e}")

def dispatch_end_to_end():
    if not SOURCE_FILE or not os.path.exists(SOURCE_FILE):
        raise FileNotFoundError(f"Source file '{SOURCE_FILE}' not found or not selected.")
    if not ROOT_DIR:
        raise ValueError("Output directory not selected.")

    print(f"Starting end-to-end processing of {SOURCE_FILE}...")

    stage = STAGE_1_JOURNAL
    current_date_obj = None
    current_category = None
    current_content = []

    with open(SOURCE_FILE, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()

    for index, line in enumerate(lines):
        stripped_line = line.strip()

        # ---------------- STAGE 1: PLAIN JOURNAL ENTRIES ----------------
        if stage == STAGE_1_JOURNAL:
            if STOP_STAGE1.match(stripped_line):
                print(f"[{index+1}] Transitioning to Stage 2: Notes")
                if current_date_obj and current_content:
                    save_stage1_entry(current_date_obj, current_content)
                current_date_obj = None
                current_content = []
                stage = STAGE_2_NOTES
                continue

            match = DATE_PATTERN_STAGE1.match(line)
            if match:
                if current_date_obj and current_content:
                    save_stage1_entry(current_date_obj, current_content)
                try:
                    current_date_obj = datetime.strptime(match.group(1), '%a %b %d, %Y')
                    current_content = []
                except ValueError:
                    if current_date_obj:
                        current_content.append(line.rstrip())
            else:
                if current_date_obj:
                    current_content.append(line.rstrip())

        # ---------------- STAGE 2: NOTES ----------------
        elif stage == STAGE_2_NOTES:
            if STOP_STAGE2.match(stripped_line):
                print(f"[{index+1}] Transitioning to Stage 3: Groups")
                if current_category and current_date_obj and current_content:
                    append_block(current_date_obj, f"## {current_category}", current_content)
                current_category = None
                current_date_obj = None
                current_content = []
                stage = STAGE_3_GROUPS
                continue

            cat_match = CATEGORY_PATTERN_STAGE2.match(line)
            if cat_match:
                if current_category and current_date_obj and current_content:
                    append_block(current_date_obj, f"## {current_category}", current_content)
                    current_content = []
                    current_date_obj = None
                current_category = cat_match.group(1).strip()
                continue
                
            if current_category and current_date_obj is None:
                if stripped_line == "": continue
                date_match = DATE_PATTERN_STAGE2.match(stripped_line)
                if date_match:
                    try:
                        current_date_obj = datetime.strptime(date_match.group(1), '%a %b %d, %Y')
                        continue
                    except ValueError:
                        pass
            
            if current_category and current_date_obj:
                if stripped_line != "":
                    current_content.append(line.rstrip())

        # ---------------- STAGE 3: GROUPS (Thoughts, Quotes, etc) ----------------
        elif stage == STAGE_3_GROUPS:
            if STOP_STAGE3.match(stripped_line):
                print(f"[{index+1}] Transitioning to Stage 4: Ideas")
                if current_category and current_date_obj and current_content:
                    append_block(current_date_obj, f"### {current_category}", current_content)
                current_category = None
                current_date_obj = None
                current_content = []
                stage = STAGE_4_IDEAS
                continue

            cat_match = CATEGORY_PATTERN_STAGE3.match(line)
            if cat_match:
                if current_category and current_date_obj and current_content:
                    append_block(current_date_obj, f"### {current_category}", current_content)
                    current_content = []
                    current_date_obj = None
                current_category = cat_match.group(1).strip()
                continue

            if current_category and current_date_obj is None:
                if stripped_line == "": continue
                try:
                    current_date_obj = datetime.strptime(stripped_line, '%a %b %d, %Y')
                    continue
                except ValueError:
                    pass
            
            if current_category and current_date_obj:
                if stripped_line != "":
                    current_content.append(line.rstrip())

        # ---------------- STAGE 4: IDEAS ----------------
        elif stage == STAGE_4_IDEAS:
            if STOP_STAGE4.match(stripped_line):
                print(f"[{index+1}] Stop marker found. Halting.")
                if current_date_obj and current_content:
                    append_block(current_date_obj, "### Idea", current_content)
                break

            date_match = DATE_PATTERN_STAGE4.match(stripped_line)
            if date_match:
                if current_date_obj and current_content:
                    append_block(current_date_obj, "### Idea", current_content)
                    current_content = []
                try:
                    current_date_obj = datetime.strptime(date_match.group(1), '%a %b %d, %Y')
                    continue
                except ValueError:
                    pass

            if current_date_obj:
                elab_match = ELABORATE_PATTERN.match(stripped_line)
                if elab_match:
                    current_content.append(f"expansion: {elab_match.group(1)}")
                else:
                    if stripped_line != "":
                        current_content.append(line.rstrip())

    # ---------------- FLUSH FINAL ENTRY ----------------
    if stage == STAGE_1_JOURNAL:
        if current_date_obj and current_content:
            save_stage1_entry(current_date_obj, current_content)
    elif stage == STAGE_2_NOTES:
        if current_category and current_date_obj and current_content:
            append_block(current_date_obj, f"## {current_category}", current_content)
    elif stage == STAGE_3_GROUPS:
        if current_category and current_date_obj and current_content:
            append_block(current_date_obj, f"### {current_category}", current_content)
    elif stage == STAGE_4_IDEAS:
        if current_date_obj and current_content:
            append_block(current_date_obj, "### Idea", current_content)

    print("End-to-end processing complete. Source file was intentionally NOT overwritten.")


# ----------------- GUI WRAPPER -----------------
BG_COLOR = "#1e1e2e"
ACCENT_COLOR = "#cba6f7"
BTN_BG = "#313244"
BTN_HOVER = "#45475a"
TEXT_COLOR = "#cdd6f4"
SUBTEXT_COLOR = "#a6adc8"
FONT_MAIN = ("Segoe UI", 11)
FONT_TITLE = ("Segoe UI", 16, "bold")
FONT_SMALL = ("Segoe UI", 10)

def select_file():
    global SOURCE_FILE
    filename = filedialog.askopenfilename(
        title="Select Journal Markdown File",
        filetypes=(("Markdown Files", "*.md"), ("All Files", "*.*"))
    )
    if filename:
        SOURCE_FILE = filename
        lbl_file.config(text=f"{os.path.basename(filename)}", fg=ACCENT_COLOR)

def select_dir():
    global ROOT_DIR
    dirname = filedialog.askdirectory(title="Select Output Folder")
    if dirname:
        ROOT_DIR = dirname
        lbl_dir.config(text=f"{dirname}", fg=ACCENT_COLOR)

def start_dispatch():
    if not SOURCE_FILE or not ROOT_DIR:
        messagebox.showerror("Error", "Please select both a file and an output folder.")
        return
    try:
        dispatch_end_to_end()
        messagebox.showinfo("Success", "Journal dispatch completed successfully!")
    except Exception as e:
        messagebox.showerror("Error", f"An error occurred:\n{e}")

def on_enter(e, btn):
    btn['background'] = BTN_HOVER

def on_leave(e, btn):
    btn['background'] = BTN_BG

def create_button(parent, text, command, bg=BTN_BG, fg=TEXT_COLOR):
    btn = tk.Button(parent, text=text, command=command, font=FONT_MAIN, 
                    bg=bg, fg=fg, activebackground=ACCENT_COLOR, 
                    activeforeground=BG_COLOR, relief="flat", padx=15, pady=6, cursor="hand2")
    if bg == BTN_BG:
        btn.bind("<Enter>", lambda e: on_enter(e, btn))
        btn.bind("<Leave>", lambda e: on_leave(e, btn))
    return btn

def run_gui():
    global lbl_file, lbl_dir
    root = tk.Tk()
    root.title("Journalistic Dispatcher")
    root.geometry("520x330")
    root.configure(bg=BG_COLOR)
    
    # Header
    header_frame = tk.Frame(root, bg=BG_COLOR)
    header_frame.pack(pady=(25, 10), fill="x")
    tk.Label(header_frame, text="Journalistic Extractor", font=FONT_TITLE, bg=BG_COLOR, fg=ACCENT_COLOR).pack()
    tk.Label(header_frame, text="Convert mega-exports into neat daily entries", font=FONT_SMALL, bg=BG_COLOR, fg=SUBTEXT_COLOR).pack()
    
    # Main Content
    content_frame = tk.Frame(root, bg=BG_COLOR)
    content_frame.pack(pady=10, padx=30, fill="both", expand=True)
    
    # File Row
    file_frame = tk.Frame(content_frame, bg=BG_COLOR)
    file_frame.pack(fill="x", pady=10)
    btn_file = create_button(file_frame, "Browse File", select_file)
    btn_file.pack(side="left")
    lbl_file = tk.Label(file_frame, text="No file selected", font=FONT_SMALL, bg=BG_COLOR, fg=SUBTEXT_COLOR, anchor="w", padx=15)
    lbl_file.pack(side="left", fill="x", expand=True)
    
    # Dir Row
    dir_frame = tk.Frame(content_frame, bg=BG_COLOR)
    dir_frame.pack(fill="x", pady=10)
    btn_dir = create_button(dir_frame, "Output Folder", select_dir)
    btn_dir.pack(side="left")
    lbl_dir = tk.Label(dir_frame, text="No folder selected", font=FONT_SMALL, bg=BG_COLOR, fg=SUBTEXT_COLOR, anchor="w", padx=15)
    lbl_dir.pack(side="left", fill="x", expand=True)
    
    # Start Button
    btn_start = tk.Button(root, text="Start Extraction", command=start_dispatch, font=("Segoe UI", 12, "bold"),
                          bg=ACCENT_COLOR, fg=BG_COLOR, activebackground=TEXT_COLOR, 
                          activeforeground=BG_COLOR, relief="flat", padx=25, pady=10, cursor="hand2")
    btn_start.pack(pady=(10, 25))
    
    root.mainloop()

if __name__ == "__main__":
    run_gui()
