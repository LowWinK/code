import cv2
import numpy as np
import os
import matplotlib.pyplot as plt
from scipy.io.wavfile import write

# Try to import colour package, provide instructions if not available
try:
    import colour
    from colour.models import XYZ_to_xy
except ImportError:
    print("Error: 'colour' package not found.")
    print("Please install it using: pip install colour-science")
    exit(1)

def create_color_sound_converter(image_path="E:\\code\\sound and chemistry\\flame.png"):
    """Main class to handle the color to sound conversion process"""
    class ColorSoundConverter:
        def __init__(self, image_path):
            self.image_path = image_path
            self.img = None
            self.clicked_colors = []
            
            # Load CIE 1931 color space data
            self.cmfs = colour.MSDS_CMFS["CIE 1931 2 Degree Standard Observer"]
            self.wavelengths_ref = self.cmfs.wavelengths
            self.XYZ_cmfs = self.cmfs.values
            self.xy_cmfs = XYZ_to_xy(self.XYZ_cmfs)
            
            # Define D65 white point
            self.illuminant = "D65"
            self.xy_white = colour.CCS_ILLUMINANTS["CIE 1931 2 Degree Standard Observer"][self.illuminant]
            
            # Audio parameters
            self.duration = 3  # seconds
            self.sample_rate = 44100
            
        def load_image(self):
            """Load the image and handle errors"""
            if not self.image_path:
                raise ValueError("Image path not provided")
                
            if not os.path.exists(self.image_path):
                raise FileNotFoundError(f"Image file not found: {self.image_path}")
                
            self.img = cv2.imread(self.image_path)
            if self.img is None:
                raise ValueError(f"Failed to load image: {self.image_path}")
                
            return self.img
        
        def mouse_callback(self, event, x, y, flags, param):
            """Handle mouse clicks to select flame parts"""
            if event == cv2.EVENT_LBUTTONDOWN and len(self.clicked_colors) < 3:
                bgr = self.img[y, x]
                rgb = [bgr[2], bgr[1], bgr[0]]  # BGR to RGB
                self.clicked_colors.append(rgb)
                
                # Add visual feedback
                cv2.circle(self.img, (x, y), 5, (0, 255, 0), -1)
                label = ["Outer flame", "Inner flame", "Flame core"][len(self.clicked_colors)-1]
                cv2.putText(self.img, label, (x+10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                cv2.imshow("Select flame parts", self.img)
                
                print(f"Selected {label}: RGB = {rgb}")
        
        def select_colors(self):
            """UI for selecting colors from the image"""
            try:
                img_copy = self.img.copy()
                cv2.namedWindow("Select flame parts")
                cv2.setMouseCallback("Select flame parts", self.mouse_callback)
                
                print("Please click on: 1) Outer flame, 2) Inner flame, 3) Flame core")
                cv2.imshow("Select flame parts", self.img)
                
                while len(self.clicked_colors) < 3:
                    key = cv2.waitKey(100)
                    if key == 27:  # ESC key
                        break
                
                cv2.destroyAllWindows()
                self.img = img_copy  # Restore original image
                return self.clicked_colors
                
            except Exception as e:
                cv2.destroyAllWindows()
                raise Exception(f"Error during color selection: {str(e)}")
        
        def RGB_to_dominant_wavelength(self, rgb):
            """Convert RGB to dominant wavelength"""
            try:
                rgb_norm = np.array(rgb) / 255.0
                rgb_linear = colour.cctf_decoding(rgb_norm)  # Inverse gamma correction
                XYZ = colour.sRGB_to_XYZ(rgb_linear)
                wl = self.XYZ_to_dominant_wavelength(XYZ)
                return wl
            except Exception as e:
                print(f"Error converting RGB {rgb} to wavelength: {str(e)}")
                return np.nan
        
        def XYZ_to_dominant_wavelength(self, XYZ):
            """Calculate dominant wavelength from XYZ values"""
            xy_target = XYZ_to_xy(XYZ)
            
            dx = xy_target[0] - self.xy_white[0]
            dy = xy_target[1] - self.xy_white[1]
            
            if abs(dx) < 1e-9 and abs(dy) < 1e-9:
                return np.nan
            
            closest_wl = None
            min_distance = float('inf')
            is_complementary = False
            
            # Include the purple line segment connecting the ends of the spectrum
            indices = list(range(len(self.wavelengths_ref)-1)) + [(len(self.wavelengths_ref)-1, 0)]
            
            for i in indices:
                if isinstance(i, tuple):
                    i1, i2 = i
                    x1, y1 = self.xy_cmfs[i1]
                    x2, y2 = self.xy_cmfs[i2]
                else:
                    x1, y1 = self.xy_cmfs[i]
                    x2, y2 = self.xy_cmfs[i+1]
                
                # Calculate intersection point
                denominator = (x2 - x1)*dy - (y2 - y1)*dx
                if abs(denominator) < 1e-9:
                    continue
                
                t_numerator = (self.xy_white[0] - x1)*dy - (self.xy_white[1] - y1)*dx
                t = t_numerator / denominator
                s = ((x1 - self.xy_white[0])*(y2 - y1) - (y1 - self.xy_white[1])*(x2 - x1)) / denominator
                
                if 0 <= t <= 1:
                    intersect_x = x1 + t*(x2 - x1)
                    intersect_y = y1 + t*(y2 - y1)
                    distance = np.hypot(intersect_x - xy_target[0], intersect_y - xy_target[1])
                    
                    if distance < min_distance:
                        min_distance = distance
                        if isinstance(i, tuple):
                            wl = self.wavelengths_ref[i1] + t*(self.wavelengths_ref[i2] - self.wavelengths_ref[i1])
                        else:
                            wl = self.wavelengths_ref[i] + t*(self.wavelengths_ref[i+1] - self.wavelengths_ref[i])
                        closest_wl = wl
                        is_complementary = (s < 0)
            
            return -closest_wl if is_complementary else closest_wl if closest_wl is not None else np.nan
        
        def wavelength_to_frequency(self, wavelength):
            """Convert wavelength to audible frequency with better mapping"""
            if np.isnan(wavelength):
                return 440  # Default to A4 if wavelength is invalid
                
            wl_abs = abs(wavelength)  # Handle complementary wavelengths
            
            # Map visible spectrum (380-780nm) to frequency range (220-880 Hz)
            # This gives roughly two octaves centered on A4 (440 Hz)
            min_wl, max_wl = 380, 780
            min_freq, max_freq = 220, 880  # A3 to A5
            
            # Logarithmic mapping (feels more natural for pitch)
            if min_wl <= wl_abs <= max_wl:
                # Invert wavelength mapping (lower wavelength = higher frequency)
                normalized = (max_wl - wl_abs) / (max_wl - min_wl)
                freq = min_freq * (max_freq/min_freq) ** normalized
            else:
                # Use A4 for out-of-range values
                freq = 440
                
            return freq
        
        def generate_single_audio(self, frequency, name):
            """Generate audio for a single frequency"""
            t = np.linspace(0, self.duration, int(self.sample_rate * self.duration))
            
            # Create richer timbre with harmonics
            fundamental = np.sin(2 * np.pi * frequency * t)
            harmonic1 = 0.5 * np.sin(2 * np.pi * frequency * 2 * t)  # 1st overtone
            harmonic2 = 0.25 * np.sin(2 * np.pi * frequency * 3 * t)  # 2nd overtone
            harmonic3 = 0.125 * np.sin(2 * np.pi * frequency * 4 * t)  # 3rd overtone
            
            # Mix harmonics
            audio = fundamental + harmonic1 + harmonic2 + harmonic3
            
            # Apply envelope for smoother sound
            envelope = np.ones_like(t)
            attack = int(0.05 * self.sample_rate)  # 50ms attack
            decay = int(0.3 * self.sample_rate)    # 300ms decay
            release = int(0.2 * self.sample_rate)  # 200ms release
            
            envelope[:attack] = np.linspace(0, 1, attack)  # Attack phase
            envelope[-release:] = np.linspace(1, 0, release)  # Release phase
            
            audio = audio * envelope
            
            # Normalize to prevent clipping
            audio = audio / np.max(np.abs(audio)) * 0.9
            
            # Save to file
            output_path = f"flame_sound_{name}.wav"
            write(output_path, self.sample_rate, (audio * 32767).astype(np.int16))
            
            return output_path
        
        def visualize_results(self, rgb_values, wavelengths, frequencies):
            """Visualize the conversion process"""
            flame_parts = ["Outer flame", "Inner flame", "Flame core"]
            
            plt.figure(figsize=(12, 8))
            
            # Color display
            plt.subplot(3, 1, 1)
            for i, rgb in enumerate(rgb_values):
                plt.bar(i, 1, color=[c/255 for c in rgb], width=0.5)
            plt.yticks([])
            plt.xticks(range(len(flame_parts)), flame_parts)
            plt.title("Selected Colors")
            
            # Wavelength display
            plt.subplot(3, 1, 2)
            for i, wl in enumerate(wavelengths):
                plt.bar(i, abs(wl) if not np.isnan(wl) else 0, 
                        color="purple" if wl < 0 else "blue" if np.isnan(wl) else "green", 
                        width=0.5)
                plt.text(i, abs(wl)/2 if not np.isnan(wl) else 10, 
                         f"{abs(wl):.1f}nm" if not np.isnan(wl) else "N/A", 
                         ha='center')
            plt.xticks(range(len(flame_parts)), flame_parts)
            plt.ylabel("Wavelength (nm)")
            plt.title("Dominant Wavelengths" + " (negative values indicate complementary colors)")
            
            # Frequency display
            plt.subplot(3, 1, 3)
            for i, freq in enumerate(frequencies):
                plt.bar(i, freq, color="orange", width=0.5)
                plt.text(i, freq/2, f"{freq:.1f}Hz", ha='center')
            plt.xticks(range(len(flame_parts)), flame_parts)
            plt.ylabel("Frequency (Hz)")
            plt.title("Sound Frequencies")
            
            plt.tight_layout()
            plt.savefig("flame_sound_analysis.png")
            plt.show()
            
        def process(self):
            """Run the complete conversion process"""
            print("\n==== Flame Color to Sound Converter ====")
            
            # Step 1: Load the image
            try:
                self.load_image()
                print(f"Loaded image: {self.image_path}")
            except Exception as e:
                print(f"Error: {str(e)}")
                return False
                
            # Step 2: Select colors
            try:
                self.select_colors()
                if len(self.clicked_colors) < 3:
                    print("Warning: Not all flame parts were selected.")
            except Exception as e:
                print(f"Error during color selection: {str(e)}")
                return False
                
            # Step 3: Convert RGB to wavelength
            wavelengths = []
            print("\nConverting colors to wavelengths:")
            for i, rgb in enumerate(self.clicked_colors):
                part = ["Outer flame", "Inner flame", "Flame core"][i]
                wl = self.RGB_to_dominant_wavelength(rgb)
                wavelengths.append(wl)
                wl_str = f"{abs(wl):.1f}nm (complementary)" if wl < 0 else f"{wl:.1f}nm" if not np.isnan(wl) else "N/A"
                print(f"{part}: RGB {rgb} → {wl_str}")
                
            # Step 4: Convert wavelength to frequency
            frequencies = []
            print("\nConverting wavelengths to frequencies:")
            for i, wl in enumerate(wavelengths):
                part = ["Outer flame", "Inner flame", "Flame core"][i]
                freq = self.wavelength_to_frequency(wl)
                frequencies.append(freq)
                print(f"{part}: {abs(wl):.1f}nm → {freq:.1f}Hz")
                
            # Step 5: Generate and save individual audio files
            try:
                print("\nGenerating separate audio files:")
                parts = ["outer", "inner", "core"]
                for i, freq in enumerate(frequencies):
                    if i < len(parts):
                        part_name = parts[i]
                        output_path = self.generate_single_audio(freq, part_name)
                        print(f"- {parts[i].capitalize()} flame sound saved to: {output_path}")
            except Exception as e:
                print(f"Error generating audio: {str(e)}")
                return False
                
            # Step 6: Visualize results
            try:
                self.visualize_results(self.clicked_colors, wavelengths, frequencies)
            except Exception as e:
                print(f"Error generating visualization: {str(e)}")
                
            return True
    
    return ColorSoundConverter(image_path)

# Execute if run as script
if __name__ == "__main__":
    # Use the hard-coded image path
    image_path = "E:\\code\\sound and chemistry\\flame.png"
    
    # Create and run the converter
    converter = create_color_sound_converter(image_path)
    converter.process()