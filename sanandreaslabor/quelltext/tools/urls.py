import json, urllib.parse
E='https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage'
N='https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage'
B='https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/export'
def stretch(lo,hi):
    r={"rasterFunction":"Stretch","rasterFunctionArguments":{"StretchType":5,"Statistics":[[lo,hi,(lo+hi)/2,1]],"DRA":False,"UseGamma":False,"Min":0,"Max":255},"outputPixelType":"U8"}
    return urllib.parse.quote(json.dumps(r,separators=(',',':')))
def dem(b,lo,hi,size=(800,600)):
    return f"{E}?bbox={b[0]},{b[1]},{b[2]},{b[3]}&bboxSR=26911&imageSR=26911&size={size[0]},{size[1]}&format=png&f=image&interpolation=RSP_BilinearInterpolation&renderingRule={stretch(lo,hi)}"
def naip(b,size=(800,600)):
    return f"{N}?bbox={b[0]},{b[1]},{b[2]},{b[3]}&bboxSR=26911&imageSR=26911&size={size[0]},{size[1]}&format=png&f=image"
def base(b,size=(800,600)):
    return f"{B}?bbox={b[0]},{b[1]},{b[2]},{b[3]}&bboxSR=26911&imageSR=26911&size={size[0]},{size[1]}&format=png&f=image"
