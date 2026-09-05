import sys
import io
import contextlib
import traceback
import subprocess
import tempfile
import os
from typing import Dict, Any

class CodeSandboxService:
    @staticmethod
    def execute_python_code(code: str, timeout_seconds: int = 5) -> Dict[str, Any]:
        """
        Executes Python code in a safe isolated subprocess and captures standard output and errors.
        """
        try:
            with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as tmp_file:
                tmp_file.write(code)
                tmp_file_path = tmp_file.name

            try:
                res = subprocess.run(
                    [sys.executable, tmp_file_path],
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds
                )
                stdout = res.stdout
                stderr = res.stderr
                returncode = res.returncode
                success = (returncode == 0)
            finally:
                if os.path.exists(tmp_file_path):
                    os.remove(tmp_file_path)

            return {
                "success": success,
                "stdout": stdout,
                "stderr": stderr,
                "returncode": returncode,
                "output": stdout if success else (stderr or "Execution failed")
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "stdout": "",
                "stderr": f"Execution timed out after {timeout_seconds} seconds.",
                "returncode": -1,
                "output": f"Execution timed out after {timeout_seconds} seconds."
            }
        except Exception as e:
            return {
                "success": False,
                "stdout": "",
                "stderr": str(e),
                "returncode": -1,
                "output": f"Execution error: {str(e)}"
            }

    @staticmethod
    def run_python_code(code: str, timeout_seconds: int = 5) -> Dict[str, Any]:
        return CodeSandboxService.execute_python_code(code, timeout_seconds)
