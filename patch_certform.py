with open("frontend/src/pages/quality/CertForm.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if line.startswith("import { LineChart"):
        new_lines.append(line)
        new_lines.append("import CertItemsTable from './components/CertItemsTable';\n")
        new_lines.append("import DistortionTable from './components/DistortionTable';\n")
        new_lines.append("import HeatProcessLog from './components/HeatProcessLog';\n")
        new_lines.append("import InspectionResultsTable from './components/InspectionResultsTable';\n")
        new_lines.append("import TemperatureCurve from './components/TemperatureCurve';\n\n")
        new_lines.append("const F = ({ label, children, className }) => (\n")
        new_lines.append("  <div className={className}>\n")
        new_lines.append("    <label className=\"form-label\">{label}</label>\n")
        new_lines.append("    {children}\n")
        new_lines.append("  </div>\n")
        new_lines.append(");\n")
    else:
        new_lines.append(line)

lines = new_lines

start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "        {/* Items */}" in line:
        start_idx = i
    if "        {/* Photos */}" in line:
        end_idx = i

if start_idx != -1 and end_idx != -1:
    replacement = """        <CertItemsTable certItems={certItems} setCertItems={setCertItems} />
        <DistortionTable form={form} setForm={setForm} set={set} />
        <HeatProcessLog heatRows={heatRows} setHeatRows={setHeatRows} emptyHeatRow={emptyHeatRow} />
        <InspectionResultsTable inspResults={inspResults} setInspResults={setInspResults} />
        <TemperatureCurve tempRows={tempRows} setTempRows={setTempRows} form={form} loadTempCycleFromRunsheet={loadTempCycleFromRunsheet} />

"""
    lines = lines[:start_idx] + [replacement] + lines[end_idx:]
    with open("frontend/src/pages/quality/CertForm.jsx", "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("PATCH SUCCESSFUL")
else:
    print(f"FAILED TO FIND INDICES: start_idx={start_idx}, end_idx={end_idx}")
