"""impsy.impsy: provides entry point main() to impsy."""

import click
from .dataset import dataset
from .train import train
from .interaction import run
from .tflite_converter import convert_tflite

from .tests import test_mdrnn, prediction_speed_test


@click.group()
def cli():
    pass


def main():
    """The entry point function for IMPSY, this just passes through the interfaces for each command"""
    cli.add_command(dataset)
    cli.add_command(train)
    cli.add_command(run)
    cli.add_command(test_mdrnn)
    cli.add_command(prediction_speed_test)
    cli.add_command(convert_tflite)
    # runs the command line interface
    cli()
