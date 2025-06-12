import sys
import os
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from tortoise import Tortoise, run_async

async def main():
    # Here we connect to a MySQL database
    # also specify the app name of "models"
    # which contain models from "TruthEngine.model.entity.Scripts"
    await Tortoise.init(
        db_url='mysql://truth_engine:JPX7jy24kAcH5ecm@139.224.192.180:3306/truth_engine',
        modules={'models': ['model.entity.Scripts']}
    )
    await Tortoise.generate_schemas()
    print("Database schemas generated successfully!")

if __name__ == "__main__":
    run_async(main())
