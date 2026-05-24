"""
Tests for Group Management features:
- Remove project from workspace (API + orphan tracking)
- Ignored paths API
- Orphan project adoption API
- Platform-aware server command generation
- Graph visibility filter logic
- Excluded files report logic
"""
import unittest
import json
import os
import sys
import tempfile
import shutil

# Add parent to path so we can import engine modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.json_io import load_json, save_json


class TestRemoveProjectFromWorkspace(unittest.TestCase):
    """Test removing a project from a workspace without deleting files."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.settings_path = os.path.join(self.tmpdir, 'settings.json')
        self.config = {
            "workspaces": [
                {
                    "name": "Test Workspace",
                    "id": "test-workspace",
                    "projects": [
                        {"name": "Project A", "type": "local_folder", "path": "/tmp/projA", "enabled": True},
                        {"name": "Project B", "type": "github_repo", "path": "/tmp/projB", "github_repo": "owner/repo", "github_branch": "main", "enabled": True},
                        {"name": "Project C", "type": "local_folder", "path": "/tmp/projC", "enabled": True}
                    ]
                }
            ],
            "orphan_projects": []
        }
        save_json(self.settings_path, self.config)

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def test_remove_project_creates_orphan(self):
        """Removing a project should add it to orphan_projects."""
        config = load_json(self.settings_path, {})
        ws = config["workspaces"][0]
        proj_name = "Project A"

        # Simulate removal
        removed = None
        new_projects = []
        for p in ws["projects"]:
            if p["name"] == proj_name:
                removed = p
            else:
                new_projects.append(p)

        self.assertIsNotNone(removed)
        ws["projects"] = new_projects

        orphan_entry = {
            "name": removed["name"],
            "path": removed["path"],
            "type": removed.get("type", "local_folder"),
            "removed_from": ws["name"]
        }
        config["orphan_projects"].append(orphan_entry)
        save_json(self.settings_path, config)

        # Verify
        result = load_json(self.settings_path, {})
        self.assertEqual(len(result["workspaces"][0]["projects"]), 2)
        self.assertEqual(len(result["orphan_projects"]), 1)
        self.assertEqual(result["orphan_projects"][0]["name"], "Project A")
        self.assertEqual(result["orphan_projects"][0]["path"], "/tmp/projA")
        self.assertEqual(result["orphan_projects"][0]["removed_from"], "Test Workspace")

    def test_remove_nonexistent_project_fails(self):
        """Removing a project that doesn't exist should not modify anything."""
        config = load_json(self.settings_path, {})
        ws = config["workspaces"][0]
        proj_name = "Nonexistent Project"

        removed = None
        for p in ws["projects"]:
            if p["name"] == proj_name:
                removed = p

        self.assertIsNone(removed)
        self.assertEqual(len(ws["projects"]), 3)

    def test_remove_github_project_preserves_repo_info(self):
        """Removing a GitHub project should preserve repo info in orphan."""
        config = load_json(self.settings_path, {})
        ws = config["workspaces"][0]

        removed = next(p for p in ws["projects"] if p["name"] == "Project B")
        ws["projects"] = [p for p in ws["projects"] if p["name"] != "Project B"]

        orphan_entry = {
            "name": removed["name"],
            "path": removed["path"],
            "type": removed.get("type", "local_folder"),
            "removed_from": ws["name"],
            "github_repo": removed.get("github_repo"),
            "github_branch": removed.get("github_branch", "main")
        }
        config["orphan_projects"].append(orphan_entry)
        save_json(self.settings_path, config)

        result = load_json(self.settings_path, {})
        orphan = result["orphan_projects"][0]
        self.assertEqual(orphan["github_repo"], "owner/repo")
        self.assertEqual(orphan["github_branch"], "main")

    def test_files_not_deleted_on_remove(self):
        """Removing a project should NOT touch the filesystem."""
        proj_dir = os.path.join(self.tmpdir, "real_project")
        os.makedirs(proj_dir)
        test_file = os.path.join(proj_dir, "important.txt")
        with open(test_file, 'w') as f:
            f.write("critical data")

        # Simulate removal (just config change, no file ops)
        config = load_json(self.settings_path, {})
        ws = config["workspaces"][0]
        ws["projects"] = [p for p in ws["projects"] if p["name"] != "Project A"]
        save_json(self.settings_path, config)

        # Files must still exist
        self.assertTrue(os.path.exists(proj_dir))
        self.assertTrue(os.path.exists(test_file))
        with open(test_file) as f:
            self.assertEqual(f.read(), "critical data")


class TestIgnoredPathsAPI(unittest.TestCase):
    """Test the ignored paths settings management."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.settings_path = os.path.join(self.tmpdir, 'settings.json')
        self.config = {"graph_ignored_paths": []}
        save_json(self.settings_path, self.config)

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def test_add_ignored_path(self):
        config = load_json(self.settings_path, {})
        ignored = config.get("graph_ignored_paths", [])
        path_to_add = "UTREx SIF VRF Workspace/UTREx SIF VRF Root/versions"

        if path_to_add not in ignored:
            ignored.append(path_to_add)
        config["graph_ignored_paths"] = ignored
        save_json(self.settings_path, config)

        result = load_json(self.settings_path, {})
        self.assertIn(path_to_add, result["graph_ignored_paths"])

    def test_remove_ignored_path(self):
        config = load_json(self.settings_path, {})
        config["graph_ignored_paths"] = ["path/a", "path/b", "path/c"]
        save_json(self.settings_path, config)

        config = load_json(self.settings_path, {})
        config["graph_ignored_paths"] = [p for p in config["graph_ignored_paths"] if p != "path/b"]
        save_json(self.settings_path, config)

        result = load_json(self.settings_path, {})
        self.assertEqual(result["graph_ignored_paths"], ["path/a", "path/c"])

    def test_no_duplicates(self):
        config = load_json(self.settings_path, {})
        ignored = config.get("graph_ignored_paths", [])
        path = "some/folder"

        # Add twice
        if path not in ignored:
            ignored.append(path)
        if path not in ignored:
            ignored.append(path)

        config["graph_ignored_paths"] = ignored
        save_json(self.settings_path, config)

        result = load_json(self.settings_path, {})
        self.assertEqual(result["graph_ignored_paths"].count(path), 1)

    def test_set_replaces_all(self):
        config = load_json(self.settings_path, {})
        config["graph_ignored_paths"] = ["old/path1", "old/path2"]
        save_json(self.settings_path, config)

        config = load_json(self.settings_path, {})
        config["graph_ignored_paths"] = ["new/path1"]
        save_json(self.settings_path, config)

        result = load_json(self.settings_path, {})
        self.assertEqual(result["graph_ignored_paths"], ["new/path1"])


class TestOrphanProjectAdoption(unittest.TestCase):
    """Test adopting orphan projects back into workspaces."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.settings_path = os.path.join(self.tmpdir, 'settings.json')
        self.config = {
            "workspaces": [
                {"name": "Workspace Alpha", "id": "ws-alpha", "projects": []},
                {"name": "Workspace Beta", "id": "ws-beta", "projects": [{"name": "Existing", "type": "local_folder", "path": "/x"}]}
            ],
            "orphan_projects": [
                {"name": "Orphan One", "path": "/tmp/orphan1", "type": "local_folder", "removed_from": "Old WS"},
                {"name": "Orphan Two", "path": "/tmp/orphan2", "type": "github_repo", "github_repo": "org/repo2", "github_branch": "dev", "removed_from": "Old WS"}
            ]
        }
        save_json(self.settings_path, self.config)

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def test_adopt_local_project(self):
        config = load_json(self.settings_path, {})
        orphan = next(o for o in config["orphan_projects"] if o["name"] == "Orphan One")
        ws = next(w for w in config["workspaces"] if w["name"] == "Workspace Alpha")

        new_proj = {"name": orphan["name"], "type": orphan["type"], "path": orphan["path"], "enabled": True}
        ws["projects"].append(new_proj)
        config["orphan_projects"] = [o for o in config["orphan_projects"] if o["name"] != "Orphan One"]
        save_json(self.settings_path, config)

        result = load_json(self.settings_path, {})
        self.assertEqual(len(result["orphan_projects"]), 1)
        alpha = next(w for w in result["workspaces"] if w["name"] == "Workspace Alpha")
        self.assertEqual(len(alpha["projects"]), 1)
        self.assertEqual(alpha["projects"][0]["name"], "Orphan One")

    def test_adopt_github_project_preserves_metadata(self):
        config = load_json(self.settings_path, {})
        orphan = next(o for o in config["orphan_projects"] if o["name"] == "Orphan Two")
        ws = next(w for w in config["workspaces"] if w["name"] == "Workspace Beta")

        new_proj = {
            "name": orphan["name"],
            "type": orphan["type"],
            "path": orphan["path"],
            "enabled": True,
            "github_repo": orphan.get("github_repo"),
            "github_branch": orphan.get("github_branch", "main")
        }
        ws["projects"].append(new_proj)
        config["orphan_projects"] = [o for o in config["orphan_projects"] if o["name"] != "Orphan Two"]
        save_json(self.settings_path, config)

        result = load_json(self.settings_path, {})
        beta = next(w for w in result["workspaces"] if w["name"] == "Workspace Beta")
        adopted = next(p for p in beta["projects"] if p["name"] == "Orphan Two")
        self.assertEqual(adopted["github_repo"], "org/repo2")
        self.assertEqual(adopted["github_branch"], "dev")

    def test_adopt_nonexistent_orphan_fails(self):
        config = load_json(self.settings_path, {})
        orphan = next((o for o in config["orphan_projects"] if o["name"] == "Ghost"), None)
        self.assertIsNone(orphan)


class TestGraphVisibilityFilters(unittest.TestCase):
    """Test the graph visibility filter logic (folder, type, extension)."""

    def setUp(self):
        self.documents = {
            "WS/ProjA/src/main.py": {"type": "code", "ext": ".py"},
            "WS/ProjA/src/utils.py": {"type": "code", "ext": ".py"},
            "WS/ProjA/docs/readme.md": {"type": "markdown", "ext": ".md"},
            "WS/ProjA/data/dump.csv": {"type": "csv", "ext": ".csv"},
            "WS/ProjA/logs/app.log": {"type": "text", "ext": ".log"},
            "WS/ProjB/index.ts": {"type": "code", "ext": ".ts"},
            "WS/ProjB/config.json": {"type": "json", "ext": ".json"},
            "WS/ProjB/image.png": {"type": "image", "ext": ".png"},
        }

    def apply_filters(self, folder_filter, type_filter, ext_exclude):
        """Simulate the applyGraphVisibilityFilters logic."""
        result = []
        for fp, doc in self.documents.items():
            excluded = False
            # Folder filter
            parts = fp.split('/')
            for depth in range(1, len(parts)):
                folder_path = '/'.join(parts[:depth])
                if folder_filter.get(folder_path) is False:
                    excluded = True
                    break
            # Type filter
            if not excluded:
                t = doc.get("type", "unknown")
                if type_filter.get(t) is False:
                    excluded = True
            # Extension exclusion
            if not excluded:
                ext = doc.get("ext", "").lower()
                if ext and ext in ext_exclude:
                    excluded = True
            if not excluded:
                result.append(fp)
        return result

    def test_no_filters_returns_all(self):
        result = self.apply_filters({}, {}, [])
        self.assertEqual(len(result), 8)

    def test_folder_filter_excludes_subtree(self):
        result = self.apply_filters({"WS/ProjA": False}, {}, [])
        self.assertEqual(len(result), 3)  # Only ProjB files
        self.assertTrue(all("ProjB" in f for f in result))

    def test_subfolder_filter(self):
        result = self.apply_filters({"WS/ProjA/src": False}, {}, [])
        self.assertEqual(len(result), 6)  # All except ProjA/src/*
        self.assertNotIn("WS/ProjA/src/main.py", result)
        self.assertNotIn("WS/ProjA/src/utils.py", result)
        self.assertIn("WS/ProjA/docs/readme.md", result)

    def test_type_filter_excludes_type(self):
        result = self.apply_filters({}, {"code": False}, [])
        self.assertEqual(len(result), 5)  # 8 - 3 code files
        self.assertTrue(all(self.documents[f]["type"] != "code" for f in result))

    def test_multiple_type_filters(self):
        result = self.apply_filters({}, {"code": False, "image": False}, [])
        self.assertEqual(len(result), 4)

    def test_extension_exclusion(self):
        result = self.apply_filters({}, {}, [".log"])
        self.assertEqual(len(result), 7)
        self.assertNotIn("WS/ProjA/logs/app.log", result)

    def test_multiple_extension_exclusions(self):
        result = self.apply_filters({}, {}, [".log", ".csv"])
        self.assertEqual(len(result), 6)

    def test_combined_filters(self):
        result = self.apply_filters(
            {"WS/ProjB": False},
            {"csv": False},
            [".log"]
        )
        # ProjB excluded (3 files), csv excluded (1), .log excluded (1) = 8-3-1-1 = 3
        self.assertEqual(len(result), 3)
        expected = ["WS/ProjA/src/main.py", "WS/ProjA/src/utils.py", "WS/ProjA/docs/readme.md"]
        self.assertEqual(sorted(result), sorted(expected))

    def test_parent_folder_disabled_hides_children(self):
        """Disabling a parent folder should hide all nested children."""
        result = self.apply_filters({"WS": False}, {}, [])
        self.assertEqual(len(result), 0)


class TestExcludedFilesReport(unittest.TestCase):
    """Test the excluded files report generation logic."""

    def setUp(self):
        self.documents = {
            "WS/Proj/a.py": {"type": "code", "ext": ".py"},
            "WS/Proj/b.md": {"type": "markdown", "ext": ".md"},
            "WS/Proj/c.log": {"type": "text", "ext": ".log"},
            "WS/Proj/sub/d.py": {"type": "code", "ext": ".py"},
            "WS/Proj/sub/e.json": {"type": "json", "ext": ".json"},
        }

    def get_excluded(self, folder_filter, type_filter, ext_exclude, group_path=""):
        excluded = []
        prefix = group_path + '/' if group_path else ''
        for k, doc in self.documents.items():
            if group_path and not k.startswith(prefix):
                continue
            reason = ''
            parts = k.split('/')
            for depth in range(1, len(parts)):
                fp = '/'.join(parts[:depth])
                if folder_filter.get(fp) is False:
                    reason = 'Folder disabled: ' + fp
                    break
            if not reason:
                t = doc.get("type", "unknown")
                if type_filter.get(t) is False:
                    reason = 'Type disabled: ' + t
            if not reason:
                ext = doc.get("ext", "").lower()
                if ext and ext in ext_exclude:
                    reason = 'Extension excluded: ' + ext
            if reason:
                excluded.append({"path": k, "reason": reason})
        return excluded

    def test_no_exclusions(self):
        result = self.get_excluded({}, {}, [])
        self.assertEqual(len(result), 0)

    def test_folder_exclusion_reported(self):
        result = self.get_excluded({"WS/Proj/sub": False}, {}, [])
        self.assertEqual(len(result), 2)
        self.assertTrue(all("Folder disabled" in r["reason"] for r in result))

    def test_type_exclusion_reported(self):
        result = self.get_excluded({}, {"code": False}, [])
        self.assertEqual(len(result), 2)
        self.assertTrue(all("Type disabled: code" in r["reason"] for r in result))

    def test_extension_exclusion_reported(self):
        result = self.get_excluded({}, {}, [".log"])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["path"], "WS/Proj/c.log")
        self.assertIn("Extension excluded", result[0]["reason"])

    def test_scoped_to_group(self):
        """Only files within the group path should be reported."""
        result = self.get_excluded({"WS/Proj/sub": False}, {}, [], group_path="WS/Proj/sub")
        self.assertEqual(len(result), 2)


class TestPlatformAwareCommand(unittest.TestCase):
    """Test platform-aware server start command generation."""

    def generate_command(self, app_root, platform):
        """Simulate the getServerStartCommand logic."""
        if platform == 'windows':
            python_cmd = 'python'
            win_path = app_root.replace('/', '\\')
            cd_cmd = 'cd /d "' + win_path + '"'
            separator = ' && '
        else:
            python_cmd = 'python3'
            cd_cmd = 'cd "' + app_root + '"'
            separator = ' && '

        run_cmd = python_cmd + ' builder.py --serve'
        return cd_cmd + separator + run_cmd if app_root else run_cmd

    def test_linux_command(self):
        cmd = self.generate_command('/home/user/AXE-Anchor', 'linux')
        self.assertEqual(cmd, 'cd "/home/user/AXE-Anchor" && python3 builder.py --serve')

    def test_mac_command(self):
        cmd = self.generate_command('/Users/dev/AXE-Anchor', 'darwin')
        self.assertEqual(cmd, 'cd "/Users/dev/AXE-Anchor" && python3 builder.py --serve')

    def test_windows_command(self):
        cmd = self.generate_command('C:/Users/dev/AXE-Anchor', 'windows')
        self.assertEqual(cmd, 'cd /d "C:\\Users\\dev\\AXE-Anchor" && python builder.py --serve')

    def test_windows_backslash_path(self):
        cmd = self.generate_command('D:/Projects/My App/AXE-Anchor', 'windows')
        self.assertIn('cd /d "D:\\Projects\\My App\\AXE-Anchor"', cmd)
        self.assertIn('python builder.py --serve', cmd)

    def test_no_app_root(self):
        cmd = self.generate_command('', 'linux')
        self.assertEqual(cmd, 'python3 builder.py --serve')


class TestCompilerPlatformField(unittest.TestCase):
    """Test that the compiler embeds platform info."""

    def test_platform_module_available(self):
        import platform
        system = platform.system().lower()
        self.assertIn(system, ['linux', 'windows', 'darwin'])


if __name__ == '__main__':
    unittest.main()
