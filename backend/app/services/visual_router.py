import math
from typing import Dict, Any, List
from .code_sandbox import CodeSandboxService
from ..models.schemas import VisualSpec

class VisualRouter:
    @classmethod
    def generate_visual_spec(
        cls, 
        concept: str, 
        visual_type: str, 
        depth: str = "beginner",
        code_snippet: str = None
    ) -> VisualSpec:
        """
        Routes the concept to the appropriate visual renderer based on visual_type.
        Supported types:
        - 'equation/graph' (Math / Physics)
        - 'labeled-diagram' (Biology / Science)
        - 'timeline/map' (History / Literature / Chronology)
        - 'code+execution' (Programming / Algorithms)
        """
        v_type = visual_type.lower()
        if "equation" in v_type or "graph" in v_type or "math" in v_type or "physics" in v_type:
            return cls._generate_math_physics_spec(concept, depth)
        elif "diagram" in v_type or "bio" in v_type or "labeled" in v_type:
            return cls._generate_biology_diagram_spec(concept, depth)
        elif "timeline" in v_type or "map" in v_type or "history" in v_type:
            return cls._generate_history_timeline_spec(concept, depth)
        elif "code" in v_type or "execution" in v_type or "prog" in v_type:
            return cls._generate_code_execution_spec(concept, depth, code_snippet)
        else:
            # Smart default by concept keyword analysis
            concept_l = concept.lower()
            if any(w in concept_l for w in ["force", "gravity", "velocity", "energy", "equation", "calculus", "newton", "derivative", "integral"]):
                return cls._generate_math_physics_spec(concept, depth)
            elif any(w in concept_l for w in ["cell", "mitochondria", "dna", "photosynthesis", "neuron", "heart", "organ", "plant", "human"]):
                return cls._generate_biology_diagram_spec(concept, depth)
            elif any(w in concept_l for w in ["war", "empire", "revolution", "century", "dynasty", "treaty", "history", "ancient", "era"]):
                return cls._generate_history_timeline_spec(concept, depth)
            else:
                return cls._generate_code_execution_spec(concept, depth, code_snippet)

    @staticmethod
    def _generate_math_physics_spec(concept: str, depth: str) -> VisualSpec:
        # Generate plot coordinate points
        xs = [round(x * 0.5, 2) for x in range(-10, 11)]
        if "quadratic" in concept.lower() or "gravity" in concept.lower():
            ys = [round(0.5 * x**2 + 2, 2) for x in xs]
            plot_title = "Quadratic Trajectory & Velocity Curve"
            eqs = [r"s(t) = ut + \frac{1}{2}at^2", r"v(t) = u + at", r"F_{net} = m \cdot a"]
        elif "wave" in concept.lower() or "oscillation" in concept.lower():
            ys = [round(math.sin(x), 2) for x in xs]
            plot_title = "Harmonic Wave Motion: Amplitude vs Phase"
            eqs = [r"y(t) = A \sin(\omega t + \phi)", r"\omega = 2\pi f", r"E = \frac{1}{2}kA^2"]
        else:
            ys = [round(2 * x + 1, 2) for x in xs]
            plot_title = f"{concept}: Rate of Change & Mathematical Curve"
            eqs = [r"f(x) = mx + c", r"\frac{df}{dx} = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}"]

        return VisualSpec(
            type="equation/graph",
            title=f"Mathematical Derivation & Behavior: {concept}",
            payload={
                "equations": eqs,
                "plot_title": plot_title,
                "x_label": "Time (t) / Input (x)",
                "y_label": "Displacement (y) / Response f(x)",
                "x_values": xs,
                "y_values": ys,
                "step_by_step": [
                    f"1. Formulate the fundamental boundary conditions for {concept}.",
                    f"2. Apply first-principles conservation and equilibrium laws.",
                    f"3. Differentiate or integrate to solve the state trajectory over time.",
                    f"4. Verify limit behaviors as time t approaches infinity."
                ]
            }
        )

    @staticmethod
    def _generate_biology_diagram_spec(concept: str, depth: str) -> VisualSpec:
        # Generate SVG visualization
        svg_code = f"""
        <svg viewBox="0 0 600 350" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          <defs>
            <linearGradient id="cellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4338ca" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8"/>
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <rect width="600" height="350" rx="16" fill="#0f172a" stroke="#334155" strokeWidth="2"/>
          <ellipse cx="300" cy="175" rx="220" ry="120" fill="url(#cellGrad)" opacity="0.35" stroke="#38bdf8" strokeWidth="3" strokeDasharray="6 4"/>
          <circle cx="300" cy="175" r="55" fill="#6366f1" opacity="0.85" filter="url(#glow)"/>
          <circle cx="300" cy="175" r="25" fill="#a855f7"/>
          
          <!-- Organelles -->
          <ellipse cx="180" cy="140" rx="35" ry="18" fill="#10b981" opacity="0.9"/>
          <path d="M 160 140 Q 180 130 200 140" stroke="#047857" strokeWidth="2" fill="none"/>
          
          <ellipse cx="420" cy="190" rx="32" ry="16" fill="#f59e0b" opacity="0.9"/>
          <path d="M 400 190 Q 420 180 440 190" stroke="#b45309" strokeWidth="2" fill="none"/>

          <!-- Interactive Pins & Labels -->
          <line x1="300" y1="120" x2="300" y2="60" stroke="#94a3b8" strokeWidth="2"/>
          <circle cx="300" cy="60" r="4" fill="#38bdf8"/>
          <text x="300" y="45" fill="#f8fafc" fontSize="13" fontWeight="bold" textAnchor="middle">Nucleus & Genomic Core</text>

          <line x1="180" y1="122" x2="180" y2="80" stroke="#94a3b8" strokeWidth="2"/>
          <circle cx="180" cy="80" r="4" fill="#10b981"/>
          <text x="180" y="68" fill="#6ee7b7" fontSize="12" fontWeight="bold" textAnchor="middle">Mitochondria (Energy ATP)</text>

          <line x1="420" y1="206" x2="420" y2="280" stroke="#94a3b8" strokeWidth="2"/>
          <circle cx="420" cy="280" r="4" fill="#f59e0b"/>
          <text x="420" y="300" fill="#fcd34d" fontSize="12" fontWeight="bold" textAnchor="middle">Endoplasmic Reticulum</text>
        </svg>
        """.strip()

        return VisualSpec(
            type="labeled-diagram",
            title=f"Biological Architecture: {concept}",
            payload={
                "svg_code": svg_code,
                "labels": [
                    {"name": "Core Nucleus", "role": "Master control library containing hereditary instructions and transcription machinery."},
                    {"name": "Mitochondria", "role": "Power plant converting metabolic inputs into cellular ATP currency."},
                    {"name": "Cellular Membrane", "role": "Selective phospholipid bilayer regulating molecular transit."}
                ],
                "takeaways": [
                    "Structural compartmentalization allows high-efficiency specialized reactions.",
                    "Active transport gradients drive nutrient uptake against concentration gradients."
                ]
            }
        )

    @staticmethod
    def _generate_history_timeline_spec(concept: str, depth: str) -> VisualSpec:
        return VisualSpec(
            type="timeline/map",
            title=f"Historical Evolution & Milestones: {concept}",
            payload={
                "events": [
                    {"year": "Genesis / Era I", "title": "Inception & Founding Catalysts", "desc": f"Early developments and systemic pressures triggering the rise of {concept}.", "tag": "Origins"},
                    {"year": "Transformation / Era II", "title": "Critical Pivot & Acceleration", "desc": "Widespread adoption, strategic alliances, and revolutionary reformations.", "tag": "Expansion"},
                    {"year": "Consolidation / Era III", "title": "Systemic Equilibrium & Modern Legacy", "desc": "Establishment of current paradigms, global synthesis, and enduring impact.", "tag": "Modern Era"}
                ],
                "geographical_context": {
                    "region": "Global Historical Nexus",
                    "impact_scope": "Socio-political, economic, and institutional systems."
                }
            }
        )

    @classmethod
    def _generate_code_execution_spec(cls, concept: str, depth: str, code_snippet: str = None) -> VisualSpec:
        if not code_snippet:
            code_snippet = f"""# Python Demonstration: {concept}
def demonstrate_{abs(hash(concept)) % 1000}():
    items = [12, 45, 68, 90, 102]
    print("Executing computational pipeline for: {concept}")
    squared = [x**2 for x in items]
    print("Transformed Data Points:", squared)
    summary = sum(squared) / len(squared)
    print(f"Computed Empirical Metric: {{summary:.2f}}")
    return summary

res = demonstrate_{abs(hash(concept)) % 1000}()
"""
        exec_res = CodeSandboxService.execute_python_code(code_snippet)
        
        return VisualSpec(
            type="code+execution",
            title=f"Sandboxed Code Execution: {concept}",
            payload={
                "language": "python",
                "code": code_snippet.strip(),
                "stdout": exec_res.get("stdout", ""),
                "stderr": exec_res.get("stderr", ""),
                "output": exec_res.get("output", ""),
                "success": exec_res.get("success", True),
                "steps": [
                    "1. Define clean modular functions encapsulating core operations.",
                    "2. Transform data vectors with predictable time complexity.",
                    "3. Validate runtime outputs against mathematical bounds."
                ]
            }
        )
